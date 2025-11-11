import type {
  LoadedConfig,
  CollectionItem,
  DocCollectionItem,
  MetaCollectionItem,
} from '@/config/build';
import path from 'path';
import { CodeGen, createCodegen, ident } from './codegen/utils';
import { glob } from 'tinyglobby';
import { readFileWithCache } from './codegen/cache';
import { fumaMatter } from './fuma-matter';
import { validate } from './validation';
import { getGitTimestamp } from './git-timestamp';
import { createHash } from 'crypto';
import type { LazyEntry } from '@/runtime/dynamic';
import { EmitEntry } from '@/core';

export interface GenerateIndexFileOptions {
  target?: 'default' | 'vite';

  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;

  outDir: string;
  config: LoadedConfig;
  configPath: string;
}

export async function emitIndexFiles(
  options: GenerateIndexFileOptions,
): Promise<EmitEntry[]> {
  const out: EmitEntry[] = [];
  out.push({
    path: 'browser.ts',
    content: await generateBrowserIndexFile(options),
  });

  out.push({
    path: 'dynamic.ts',
    content: await generateDynamicIndexFile(options),
  });

  out.push({
    path: 'index.ts',
    content: await generateServerIndexFile(options),
  });

  return out;
}

export async function generateServerIndexFile(
  options: GenerateIndexFileOptions,
): Promise<string> {
  const {
    target = 'default',
    outDir,
    addJsExtension = false,
    config,
    configPath,
  } = options;

  const codegen = createCodegen({
    target,
    outDir,
    jsExtension: addJsExtension,
  });

  codegen.lines.push(
    `import { fromConfig } from 'fumadocs-mdx/runtime/server';`,
    `import type * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = fromConfig<typeof Config>();`,
  );

  async function generateCollectionObject(
    collection: CollectionItem,
  ): Promise<string | undefined> {
    if (collection.type === 'docs' && collection.docs.dynamic) return;

    if (collection.type === 'docs' && collection.docs.async) {
      const [metaGlob, headGlob, bodyGlob] = await Promise.all([
        generateMetaCollectionGlob(codegen, collection.meta, true),
        generateDocCollectionFrontmatterGlob(codegen, collection.docs, true),
        generateDocCollectionGlob(codegen, collection.docs),
      ]);

      return `create.docsLazy("${collection.name}", "${collection.dir}", ${metaGlob}, ${headGlob}, ${bodyGlob})`;
    }

    if (collection.type === 'docs') {
      const [metaGlob, docGlob] = await Promise.all([
        generateMetaCollectionGlob(codegen, collection.meta, true),
        generateDocCollectionGlob(codegen, collection.docs),
      ]);

      return `create.docs("${collection.name}", "${collection.dir}", ${metaGlob}, ${docGlob})`;
    }

    if (collection.type === 'doc' && collection.dynamic) return;

    if (collection.type === 'doc' && collection.async) {
      const [headGlob, bodyGlob] = await Promise.all([
        generateDocCollectionFrontmatterGlob(codegen, collection, true),
        generateDocCollectionGlob(codegen, collection),
      ]);

      return `create.docLazy("${collection.name}", "${collection.dir}", ${headGlob}, ${bodyGlob})`;
    }

    if (collection.type === 'doc') {
      return `create.doc("${collection.name}", "${collection.dir}", ${await generateDocCollectionGlob(
        codegen,
        collection,
        true,
      )})`;
    }

    return `create.meta("${collection.name}", "${collection.dir}", ${await generateMetaCollectionGlob(
      codegen,
      collection,
      true,
    )})`;
  }

  codegen.pushAsync(
    config.collectionList.map(async (collection) => {
      return `\nexport const ${collection.name} = ${await generateCollectionObject(collection)};`;
    }),
  );

  return codegen.toString();
}

export async function generateDynamicIndexFile(
  options: GenerateIndexFileOptions,
) {
  const {
    target,
    outDir,
    addJsExtension = false,
    config,
    configPath,
  } = options;

  const codegen = createCodegen({
    target,
    outDir,
    jsExtension: addJsExtension,
  });

  codegen.lines.push(
    `import { fromConfigDynamic } from 'fumadocs-mdx/runtime/dynamic';`,
    `import * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = fromConfigDynamic(Config);`,
  );

  async function onCollection(
    parent: CollectionItem,
  ): Promise<string | undefined> {
    let collection: DocCollectionItem | undefined;
    if (parent.type === 'doc') collection = parent;
    else if (parent.type === 'docs') collection = parent.docs;

    if (!collection || !collection.dynamic) return;

    const files = await glob(collection.patterns, {
      cwd: collection.dir,
    });
    const entryPromises = files.map(async (file) => {
      const fullPath = path.join(collection.dir, file);
      const content = await readFileWithCache(fullPath).catch(() => '');
      const parsed = fumaMatter(content);
      let data = parsed.data;

      if (collection.schema) {
        data = await validate(
          collection.schema,
          parsed.data,
          { path: fullPath, source: parsed.content },
          `invalid frontmatter in ${fullPath}`,
        );
      }

      let lastModified: Date | undefined;
      if (config.global?.lastModifiedTime === 'git') {
        lastModified = await getGitTimestamp(fullPath);
      }

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
        lastModified,
        hash,
      } satisfies LazyEntry<unknown>)) {
        infoStr.push(`${k}: ${JSON.stringify(v)}`);
      }

      return `{ ${infoStr.join(', ')} }`;
    });

    const entriesStr = (await Promise.all(entryPromises)).join(', ');

    if (parent.type === 'docs') {
      const metaGlob = await generateMetaCollectionGlob(
        codegen,
        parent.meta,
        true,
      );

      return `export const ${parent.name} = create.docs("${parent.name}", "${parent.dir}", ${metaGlob}, ${entriesStr})`;
    }

    return `export const ${collection.name} = create.doc("${collection.name}", "${collection.dir}", ${entriesStr})`;
  }

  codegen.pushAsync(config.collectionList.map(onCollection));

  return codegen.toString();
}

export async function generateBrowserIndexFile(
  options: GenerateIndexFileOptions,
): Promise<string> {
  const {
    target,
    outDir,
    addJsExtension = false,
    config,
    configPath,
  } = options;
  const codegen = createCodegen({
    target,
    outDir,
    jsExtension: addJsExtension,
  });

  codegen.lines.push(
    `import { fromConfig } from 'fumadocs-mdx/runtime/browser';`,
    `import type * as Config from '${codegen.formatImportPath(configPath)}';`,
    '',
    `const create = fromConfig<typeof Config>(Config);`,
  );

  async function generateCollectionObject(
    collection: CollectionItem,
  ): Promise<string> {
    if (collection.type === 'docs') {
      const [docGlob, metaGlob] = await Promise.all([
        generateCollectionObject(collection.docs),
        generateCollectionObject(collection.meta),
      ]);

      const obj = [ident(`doc: ${docGlob}`), ident(`meta: ${metaGlob}`)].join(
        ',\n',
      );

      return `{\n${obj}\n}`;
    }

    if (collection.type === 'doc') {
      return `create.doc("${collection.name}", ${await generateDocCollectionGlob(codegen, collection)})`;
    }

    return `create.meta("${collection.name}", ${await generateMetaCollectionGlob(
      codegen,
      collection,
    )})`;
  }

  codegen.pushAsync(
    config.collectionList.map(async (collection) => {
      return `\nexport const ${collection.name} = ${await generateCollectionObject(collection)};`;
    }),
  );

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
