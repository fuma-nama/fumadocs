import type { Core, CoreOptions, Plugin, PluginContext } from '@/core';
import type { CollectionItem, DocCollectionItem, MetaCollectionItem } from '@/config/build';
import path from 'path';
import { type CodeGen, createCodegen, ident, slash } from '@/utils/codegen';
import { glob } from 'tinyglobby';
import { createFSCache } from '@/utils/fs-cache';
import { createHash } from 'crypto';
import type { LazyEntry } from '@/runtime/dynamic';
import type { EmitEntry } from '@/core';
import { fumaMatter } from '@/utils/fuma-matter';
import type { ServerOptions } from '@/runtime/server';

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

export interface IndexFilePlugin {
  ['index-file']?: {
    generateTypeConfig?: (this: PluginContext) => string | void;
    serverOptions?: (this: PluginContext, options: ServerOptions) => void;
  };
}

interface FileGenContext {
  core: Core;
  workspace?: string;
  codegen: CodeGen;
  serverOptions: ServerOptions;
  tc: string;
}

const indexFileCache = createFSCache();

export default function indexFile(options: IndexFilePluginOptions = {}): Plugin {
  const { target = 'default', addJsExtension, browser = true, dynamic = true } = options;
  let dynamicCollections: CollectionItem[];

  function isDynamic(collection: CollectionItem) {
    return (
      (collection.type === 'docs' && collection.docs.dynamic) ||
      (collection.type === 'doc' && collection.dynamic)
    );
  }

  function generateConfigs(core: Core): {
    serverOptions: ServerOptions;
    tc: string;
  } {
    const serverOptions: ServerOptions = {};
    const typeConfigs: string[] = ['import("fumadocs-mdx/runtime/types").InternalTypeConfig'];
    const ctx = core.getPluginContext();

    for (const plugin of core.getPlugins()) {
      const indexFilePlugin = plugin['index-file'];
      if (!indexFilePlugin) continue;

      indexFilePlugin.serverOptions?.call(ctx, serverOptions);
      const config = indexFilePlugin.generateTypeConfig?.call(ctx);
      if (config) typeConfigs.push(config);
    }

    return {
      serverOptions,
      tc: typeConfigs.join(' & '),
    };
  }

  return {
    name: 'index-file',
    config() {
      dynamicCollections = this.core.getCollections().filter(isDynamic);
    },
    configureServer(server) {
      if (!server.watcher) return;

      server.watcher.on('all', async (event, file) => {
        indexFileCache.delete(file);

        // dynamic collections always require re-generation on change
        if (dynamicCollections.length === 0) {
          // vite uses `import.meta.glob`, no need to re-generate
          if (target === 'vite') return;
          // only re-generate when adding/deleting entries
          if (target === 'default' && event === 'change') return;
        }

        const updatedCollection = this.core
          .getCollections()
          .find((collection) => collection.hasFile(file));

        if (!updatedCollection) return;
        if (!isDynamic(updatedCollection)) {
          if (target === 'vite') return;
          if (target === 'default' && event === 'change') return;
        }

        await this.core.emit({
          filterPlugin: (plugin) => plugin.name === 'index-file',
          filterWorkspace: () => false,
          write: true,
        });
      });
    },
    async emit() {
      const globCache = new Map<string, Promise<string[]>>();
      const { workspace, outDir } = this.core.getOptions();
      const { serverOptions, tc } = generateConfigs(this.core);
      const toEmitEntry = async (
        path: string,
        content: (ctx: FileGenContext) => Promise<void>,
      ): Promise<EmitEntry> => {
        const codegen = createCodegen({
          target,
          outDir: outDir,
          jsExtension: addJsExtension,
          globCache,
        });
        await content({
          core: this.core,
          codegen,
          serverOptions,
          tc,
          workspace: workspace?.name,
        });
        return {
          path,
          content: codegen.toString(),
        };
      };

      const out: Promise<EmitEntry>[] = [toEmitEntry('server.ts', generateServerIndexFile)];

      if (dynamic) out.push(toEmitEntry('dynamic.ts', generateDynamicIndexFile));

      if (browser) out.push(toEmitEntry('browser.ts', generateBrowserIndexFile));

      return await Promise.all(out);
    },
  };
}

async function generateServerIndexFile(ctx: FileGenContext) {
  const { core, codegen, serverOptions, tc } = ctx;
  codegen.lines.push(
    `import { server } from 'fumadocs-mdx/runtime/server';`,
    `import type * as Config from '${codegen.formatImportPath(core.getOptions().configPath)}';`,
    '',
    `const create = server<typeof Config, ${tc}>(${JSON.stringify(serverOptions)});`,
  );

  async function generateCollectionObject(collection: CollectionItem): Promise<string | undefined> {
    const base = getBase(collection);

    switch (collection.type) {
      case 'docs': {
        if (collection.docs.dynamic) return;

        if (collection.docs.async) {
          const [metaGlob, headGlob, bodyGlob] = await Promise.all([
            generateMetaCollectionGlob(ctx, collection.meta, true),
            generateDocCollectionFrontmatterGlob(ctx, collection.docs, true),
            generateDocCollectionGlob(ctx, collection.docs),
          ]);

          return `await create.docsLazy("${collection.name}", "${base}", ${metaGlob}, ${headGlob}, ${bodyGlob})`;
        }

        const [metaGlob, docGlob] = await Promise.all([
          generateMetaCollectionGlob(ctx, collection.meta, true),
          generateDocCollectionGlob(ctx, collection.docs, true),
        ]);

        return `await create.docs("${collection.name}", "${base}", ${metaGlob}, ${docGlob})`;
      }
      case 'doc':
        if (collection.dynamic) return;

        if (collection.async) {
          const [headGlob, bodyGlob] = await Promise.all([
            generateDocCollectionFrontmatterGlob(ctx, collection, true),
            generateDocCollectionGlob(ctx, collection),
          ]);

          return `await create.docLazy("${collection.name}", "${base}", ${headGlob}, ${bodyGlob})`;
        }

        return `await create.doc("${collection.name}", "${base}", ${await generateDocCollectionGlob(
          ctx,
          collection,
          true,
        )})`;
      case 'meta':
        return `await create.meta("${collection.name}", "${base}", ${await generateMetaCollectionGlob(
          ctx,
          collection,
          true,
        )})`;
    }
  }

  await codegen.pushAsync(
    core.getCollections().map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return `\nexport const ${collection.name} = ${obj};`;
    }),
  );
}

async function generateDynamicIndexFile(ctx: FileGenContext) {
  const { core, codegen, serverOptions, tc } = ctx;
  const { configPath, environment, outDir } = core.getOptions();
  // serializable config options
  const partialOptions: CoreOptions = {
    configPath,
    environment,
    outDir,
  };
  codegen.lines.push(
    `import { dynamic } from 'fumadocs-mdx/runtime/dynamic';`,
    `import * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = await dynamic<typeof Config, ${tc}>(Config, ${JSON.stringify(partialOptions)}, ${JSON.stringify(serverOptions)});`,
  );

  async function generateCollectionObjectEntry(
    collection: DocCollectionItem,
    absolutePath: string,
  ) {
    const fullPath = path.relative(process.cwd(), absolutePath);
    const content = await indexFileCache.read(fullPath).catch(() => '');
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
        path: path.relative(collection.dir, absolutePath),
      },
      data,
      hash,
    } satisfies LazyEntry)) {
      infoStr.push(`${k}: ${JSON.stringify(v)}`);
    }

    return `{ ${infoStr.join(', ')} }`;
  }

  async function generateCollectionObject(parent: CollectionItem): Promise<string | undefined> {
    let collection: DocCollectionItem | undefined;
    if (parent.type === 'doc') collection = parent;
    else if (parent.type === 'docs') collection = parent.docs;

    if (!collection || !collection.dynamic) return;

    const files = await glob(collection.patterns, {
      cwd: collection.dir,
      absolute: true,
    });
    const entries = await Promise.all(
      files.map((file) => generateCollectionObjectEntry(collection, file)),
    );

    switch (parent.type) {
      case 'docs': {
        const metaGlob = await generateMetaCollectionGlob(ctx, parent.meta, true);

        return `await create.docs("${parent.name}", "${getBase(parent)}", ${metaGlob}, ${entries.join(', ')})`;
      }
      case 'doc':
        return `await create.doc("${collection.name}", "${getBase(collection)}", ${entries.join(', ')})`;
    }
  }

  await codegen.pushAsync(
    core.getCollections().map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return `\nexport const ${collection.name} = ${obj};`;
    }),
  );
}

async function generateBrowserIndexFile(ctx: FileGenContext) {
  const { core, codegen, tc } = ctx;
  codegen.lines.push(
    `import { browser } from 'fumadocs-mdx/runtime/browser';`,
    `import type * as Config from '${codegen.formatImportPath(core.getOptions().configPath)}';`,
    '',
    `const create = browser<typeof Config, ${tc}>();`,
  );

  async function generateCollectionObject(collection: CollectionItem): Promise<string | undefined> {
    switch (collection.type) {
      case 'docs': {
        if (collection.docs.dynamic) return;

        return generateCollectionObject(collection.docs);
      }
      case 'doc':
        if (collection.dynamic) return;

        return `create.doc("${collection.name}", ${await generateDocCollectionGlob(ctx, collection)})`;
    }
  }

  codegen.lines.push('const browserCollections = {');

  await codegen.pushAsync(
    core.getCollections().map(async (collection) => {
      const obj = await generateCollectionObject(collection);
      if (!obj) return;

      return ident(`${collection.name}: ${obj},`);
    }),
  );

  codegen.lines.push('};', 'export default browserCollections;');
}

function getBase(collection: CollectionItem) {
  return slash(path.relative(process.cwd(), collection.dir));
}

function generateDocCollectionFrontmatterGlob(
  { codegen, workspace }: FileGenContext,
  collection: DocCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
      only: 'frontmatter',
      workspace,
    },
    import: 'frontmatter',
    base: collection.dir,
    eager,
  });
}

function generateDocCollectionGlob(
  { codegen, workspace }: FileGenContext,
  collection: DocCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
      workspace,
    },
    base: collection.dir,
    eager,
  });
}

function generateMetaCollectionGlob(
  { codegen, workspace }: FileGenContext,
  collection: MetaCollectionItem,
  eager = false,
) {
  return codegen.generateGlobImport(collection.patterns, {
    query: {
      collection: collection.name,
      workspace,
    },
    import: 'default',
    base: collection.dir,
    eager,
  });
}
