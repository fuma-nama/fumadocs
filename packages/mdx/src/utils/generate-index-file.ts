import type { LoadedConfig, CollectionItem } from '@/config/build';
import path from 'path';
import { type GlobImportOptions, generateGlobImport } from './glob-import';
import { toImportPath, ident } from './import-formatter';

export interface GenerateIndexFileOptions {
  target: 'node' | 'vite';

  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;

  outDir: string;
  config: LoadedConfig;
  configPath: string;
}

export async function generateIndexFile(
  options: GenerateIndexFileOptions,
): Promise<string> {
  const {
    target,
    outDir,
    addJsExtension = false,
    config,
    configPath,
  } = options;
  const runtimePath = 'fumadocs-mdx/runtime/server';

  const lines = [
    `import { fromConfig } from '${runtimePath}';`,
    `import type * as Config from '${toImportPath(configPath, {
      relativeTo: outDir,
      jsExtension: addJsExtension,
    })}';`,
    '',
    `export const create = fromConfig<typeof Config>();`,
  ];

  if (target === 'vite') {
    lines.unshift('/// <reference types="vite/client" />');
  }

  async function generateCollectionGlob(
    collection: CollectionItem,
  ): Promise<string> {
    if (collection.type === 'docs') {
      const [docGlob, metaGlob] = await Promise.all([
        generateCollectionGlob(collection.docs),
        generateCollectionGlob(collection.meta),
      ]);
      const obj = [ident(`doc: ${docGlob}`), ident(`meta: ${metaGlob}`)].join(
        ',\n',
      );

      return `{\n${obj}\n}`;
    }

    const dir = getCollectionDir(collection);
    if (collection.type === 'doc') {
      const docGlob = await generateGlob(options, collection.patterns, {
        query: {
          collection: collection.name,
        },
        base: dir,
      });

      if (collection.async) {
        const headBlob = await generateGlob(options, collection.patterns, {
          query: {
            only: 'frontmatter',
            collection: collection.name,
          },
          import: 'frontmatter',
          base: dir,
        });

        return `create.docLazy("${collection.name}", "${dir}", ${headBlob}, ${docGlob})`;
      }

      return `create.doc("${collection.name}", "${dir}", ${docGlob})`;
    }

    const metaGlob = await generateGlob(options, collection.patterns, {
      import: 'default',
      base: dir,
      query: {
        collection: collection.name,
      },
    });
    return `create.meta("${collection.name}", "${dir}", ${metaGlob})`;
  }

  lines.push(
    ...(await Promise.all(
      config.collectionList.map(async (collection) => {
        return `\nexport const ${collection.name} = ${await generateCollectionGlob(collection)};`;
      }),
    )),
  );

  return lines.join('\n');
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
  const runtimePath = 'fumadocs-mdx/runtime/browser';

  const lines = [
    `import { fromConfig } from '${runtimePath}';`,
    `import type * as Config from '${toImportPath(configPath, {
      relativeTo: outDir,
      jsExtension: addJsExtension,
    })}';`,
    '',
    `export const create = fromConfig<typeof Config>();`,
  ];

  if (target === 'vite') {
    lines.unshift('/// <reference types="vite/client" />');
  }

  async function generateCollectionGlob(
    collection: CollectionItem,
  ): Promise<string> {
    if (collection.type === 'docs') {
      const [docGlob, metaGlob] = await Promise.all([
        generateCollectionGlob(collection.docs),
        generateCollectionGlob(collection.meta),
      ]);

      const obj = [ident(`doc: ${docGlob}`), ident(`meta: ${metaGlob}`)].join(
        ',\n',
      );

      return `{\n${obj}\n}`;
    }

    const dir = getCollectionDir(collection);
    if (collection.type === 'doc') {
      const docGlob = await generateGlob(options, collection.patterns, {
        query: {
          collection: collection.name,
        },
        base: dir,
      });

      return `create.doc("${collection.name}", ${docGlob})`;
    }

    return `create.meta("${collection.name}", ${await generateGlob(
      options,
      collection.patterns,
      {
        import: 'default',
        base: dir,
        query: {
          collection: collection.name,
        },
      },
    )})`;
  }

  lines.push(
    ...(await Promise.all(
      config.collectionList.map(async (collection) => {
        return `\nexport const ${collection.name} = ${await generateCollectionGlob(collection)};`;
      }),
    )),
  );

  return lines.join('\n');
}

async function generateGlob(
  { target, outDir }: GenerateIndexFileOptions,
  patterns: string[],
  options: GlobImportOptions,
): Promise<string> {
  patterns = patterns.map(normalizeGlobPath);

  if (target === 'node') {
    return generateGlobImport(patterns, options);
  }

  return `import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify(
    {
      ...options,
      base: normalizeGlobPath(path.relative(outDir, options.base)),
    },
    null,
    2,
  )})`;
}

/**
 * convert into POSIX & relative file paths, such that Vite can accept it.
 */
function normalizeGlobPath(file: string) {
  file = slash(file);
  if (file.startsWith('./')) return file;
  if (file.startsWith('/')) return `.${file}`;

  return `./${file}`;
}

function getCollectionDir({ dir }: CollectionItem): string {
  if (Array.isArray(dir)) {
    if (dir.length !== 1)
      throw new Error(
        `[Fumadocs MDX] Vite Plugin doesn't support multiple \`dir\` for a collection at the moment.`,
      );

    return dir[0];
  }

  return dir;
}

function slash(path: string): string {
  const isExtendedLengthPath = path.startsWith('\\\\?\\');

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replaceAll('\\', '/');
}
