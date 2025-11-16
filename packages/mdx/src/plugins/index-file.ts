import type { Core, Plugin } from '@/core';
import type {
  LoadedConfig,
  CollectionItem,
  DocCollectionItem,
  MetaCollectionItem,
} from '@/config/build';
import path from 'path';
import { type CodeGen, createCodegen, ident } from '@/utils/codegen';
import { glob } from 'tinyglobby';
import { readFileWithCache } from '@/utils/codegen/cache';
import { createHash } from 'crypto';
import type { LazyEntry } from '@/runtime/dynamic';
import type { EmitEntry } from '@/core';
import { fumaMatter } from '@/utils/fuma-matter';

export interface IndexFilePluginOptions {
  target?: 'default' | 'vite';

  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;

  /**
   * Generate entry point for browser
   * @defaultValue true
   */
  browser?: boolean;

  /**
   * Generate entry point for dynamic compilation
   * @defaultValue true
   */
  dynamic?: boolean;
}

export default function indexFile(
  options: IndexFilePluginOptions = {},
): Plugin {
  const {
    target = 'default',
    addJsExtension,
    browser = true,
    dynamic = true,
  } = options;
  let config: LoadedConfig;
  let dynamicCollections: CollectionItem[];

  function isDynamic(collection: CollectionItem) {
    return (
      (collection.type === 'docs' && collection.docs.dynamic) ||
      (collection.type === 'doc' && collection.dynamic)
    );
  }

  return {
    name: 'index-file',
    config(v) {
      config = v;
      dynamicCollections = config.collectionList.filter(isDynamic);
    },
    configureServer(server) {
      if (!server.watcher) return;

      server.watcher.on('all', async (event, file) => {
        // dynamic collections always require re-generation on change
        if (dynamicCollections.length === 0) {
          // vite uses `import.meta.glob`, no need to re-generate
          if (target === 'vite') return;
          // only re-generate when adding/deleting entries
          if (target === 'default' && event === 'change') return;
        }

        const updatedCollection = config.collectionList.find((collection) =>
          collection.hasFile(file),
        );

        if (!updatedCollection) return;
        if (!isDynamic(updatedCollection)) {
          if (target === 'vite') return;
          if (target === 'default' && event === 'change') return;
        }

        await this.core.emitAndWrite({
          filterPlugin: (plugin) => plugin.name === 'index-file',
        });
      });
    },
    async emit() {
      const globCache = new Map<string, Promise<string[]>>();
      const makeCodeGen = () =>
        createCodegen({
          target,
          outDir: this.outDir,
          jsExtension: addJsExtension,
          globCache,
        });

      async function toEmitEntry(
        path: string,
        content: Promise<string>,
      ): Promise<EmitEntry> {
        return {
          path,
          content: await content,
        };
      }

      const out: Promise<EmitEntry>[] = [
        toEmitEntry(
          'server.ts',
          generateServerIndexFile(makeCodeGen(), config, this.configPath),
        ),
      ];

      if (dynamic)
        out.push(
          toEmitEntry(
            'dynamic.ts',
            generateDynamicIndexFile(this.core, makeCodeGen()),
          ),
        );

      if (browser)
        out.push(
          toEmitEntry(
            'browser.ts',
            generateBrowserIndexFile(makeCodeGen(), config, this.configPath),
          ),
        );

      return await Promise.all(out);
    },
  };
}

async function generateServerIndexFile(
  codegen: CodeGen,
  config: LoadedConfig,
  configPath: string,
): Promise<string> {
  codegen.lines.push(
    `import { fromConfig } from 'fumadocs-mdx/runtime/server';`,
    `import type * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = fromConfig<typeof Config>();`,
  );

  async function generateCollectionObject(
    collection: CollectionItem,
  ): Promise<string | undefined> {
    switch (collection.type) {
      case 'docs': {
        if (collection.docs.dynamic) return;

        if (collection.docs.async) {
          const [metaGlob, headGlob, bodyGlob] = await Promise.all([
            generateMetaCollectionGlob(codegen, collection.meta, true),
            generateDocCollectionFrontmatterGlob(
              codegen,
              collection.docs,
              true,
            ),
            generateDocCollectionGlob(codegen, collection.docs),
          ]);

          return `await create.docsLazy("${collection.name}", "${collection.dir}", ${metaGlob}, ${headGlob}, ${bodyGlob})`;
        }

        const [metaGlob, docGlob] = await Promise.all([
          generateMetaCollectionGlob(codegen, collection.meta, true),
          generateDocCollectionGlob(codegen, collection.docs, true),
        ]);

        return `await create.docs("${collection.name}", "${collection.dir}", ${metaGlob}, ${docGlob})`;
      }
      case 'doc':
        if (collection.dynamic) return;

        if (collection.async) {
          const [headGlob, bodyGlob] = await Promise.all([
            generateDocCollectionFrontmatterGlob(codegen, collection, true),
            generateDocCollectionGlob(codegen, collection),
          ]);

          return `await create.docLazy("${collection.name}", "${collection.dir}", ${headGlob}, ${bodyGlob})`;
        }

        return `await create.doc("${collection.name}", "${collection.dir}", ${await generateDocCollectionGlob(
          codegen,
          collection,
          true,
        )})`;
      case 'meta':
        return `await create.meta("${collection.name}", "${collection.dir}", ${await generateMetaCollectionGlob(
          codegen,
          collection,
          true,
        )})`;
    }
  }

  await codegen.pushAsync(
    config.collectionList.map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return `\nexport const ${collection.name} = ${obj};`;
    }),
  );

  return codegen.toString();
}

async function generateDynamicIndexFile(core: Core, codegen: CodeGen) {
  const { configPath } = core._options;
  codegen.lines.push(
    `import { fromConfigDynamic } from 'fumadocs-mdx/runtime/dynamic';`,
    `import * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = await fromConfigDynamic(Config);`,
  );

  async function generateCollectionObjectEntry(
    collection: DocCollectionItem,
    file: string,
  ) {
    const fullPath = path.join(collection.dir, file);
    const content = await readFileWithCache(fullPath).catch(() => '');
    const parsed = fumaMatter(content);
    const data = await core.transformFrontmatter(
      {
        collection,
        filePath: fullPath,
        source: content,
      },
      parsed.data as Record<string, unknown>,
    );

    const hash = createHash('md5').update(content).digest('hex');
    const infoStr: string[] = [
      // make sure it's included in vercel/nft
      `absolutePath: path.resolve(${JSON.stringify(fullPath)})`,
    ];
    for (const [k, v] of Object.entries({
      info: {
        fullPath,
        path: file,
      },
      data,
      hash,
    } satisfies LazyEntry)) {
      infoStr.push(`${k}: ${JSON.stringify(v)}`);
    }

    return `{ ${infoStr.join(', ')} }`;
  }

  async function generateCollectionObject(
    parent: CollectionItem,
  ): Promise<string | undefined> {
    let collection: DocCollectionItem | undefined;
    if (parent.type === 'doc') collection = parent;
    else if (parent.type === 'docs') collection = parent.docs;

    if (!collection || !collection.dynamic) return;

    const files = await glob(collection.patterns, {
      cwd: collection.dir,
    });
    const entries = await Promise.all(
      files.map((file) => generateCollectionObjectEntry(collection, file)),
    );

    switch (parent.type) {
      case 'docs': {
        const metaGlob = await generateMetaCollectionGlob(
          codegen,
          parent.meta,
          true,
        );

        return `await create.docs("${parent.name}", "${parent.dir}", ${metaGlob}, ${entries.join(', ')})`;
      }
      case 'doc':
        return `await create.doc("${collection.name}", "${collection.dir}", ${entries.join(', ')})`;
    }
  }

  await codegen.pushAsync(
    core.getConfig().collectionList.map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return `\nexport const ${collection.name} = ${obj};`;
    }),
  );

  return codegen.toString();
}

async function generateBrowserIndexFile(
  codegen: CodeGen,
  config: LoadedConfig,
  configPath: string,
): Promise<string> {
  codegen.lines.push(
    `import { fromConfig } from 'fumadocs-mdx/runtime/browser';`,
    `import type * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = fromConfig<typeof Config>();`,
  );

  async function generateCollectionObject(
    collection: CollectionItem,
  ): Promise<string | undefined> {
    switch (collection.type) {
      case 'docs': {
        if (collection.docs.dynamic) return;

        return generateCollectionObject(collection.docs);
      }
      case 'doc':
        if (collection.dynamic) return;

        return `create.doc("${collection.name}", ${await generateDocCollectionGlob(codegen, collection)})`;
    }
  }

  codegen.lines.push('const browserCollections = {');

  await codegen.pushAsync(
    config.collectionList.map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return ident(`${collection.name}: ${obj},`);
    }),
  );

  codegen.lines.push('};', 'export default browserCollections;');
  return codegen.toString();
}

function generateDocCollectionFrontmatterGlob(
  codegen: CodeGen,
  collection: DocCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
      only: 'frontmatter',
    },
    import: 'frontmatter',
    base: collection.dir,
    eager,
  });
}

function generateDocCollectionGlob(
  codegen: CodeGen,
  collection: DocCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
    },
    base: collection.dir,
    eager,
  });
}

function generateMetaCollectionGlob(
  codegen: CodeGen,
  collection: MetaCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
    },
    import: 'default',
    base: collection.dir,
    eager,
  });
}
