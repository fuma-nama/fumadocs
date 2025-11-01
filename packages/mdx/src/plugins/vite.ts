import { ident, toImportPath } from '@/utils/import-formatter';
import type { CollectionItem, LoadedConfig } from '@/config/build';
import {
  generateGlobImport,
  type GlobImportOptions,
} from '@/utils/glob-import';
import type { EmitEntry, Plugin, PluginContext } from '@/core';
import path from 'node:path';

export interface IndexFileOptions {
  /**
   * Runtime compat fallbacks for Vite specific APIs
   *
   * - `bun`: use Bun-specific APIs.
   * - `node`: use Node.js APIs.
   * - `false` (default): no fallback.
   */
  runtime?: 'bun' | 'node' | false;
  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;

  /**
   * Generate entry point for browser environment
   */
  browser?: boolean;
}

export default function vite({
  index,
}: {
  index: IndexFileOptions | boolean;
}): Plugin {
  let config: LoadedConfig;
  let indexOptions: Required<IndexFileOptions> | false;
  if (index === false) indexOptions = false;
  else indexOptions = applyDefaults(index === true ? {} : index);

  return {
    name: 'vite',
    config(v) {
      config = v;
    },
    configureServer(server) {
      if (
        !server.watcher ||
        indexOptions === false ||
        indexOptions.runtime === false
      )
        return;

      // for bun/node runtimes, alternative import.meta.glob has to be re-generated on update
      server.watcher.on('all', (event, file) => {
        if (event === 'change') return;
        const isUpdated = config.collectionList.some((collection) => {
          if (collection.type === 'docs')
            return (
              collection.docs.hasFile(file) || collection.meta.hasFile(file)
            );

          return collection.hasFile(file);
        });

        if (isUpdated) {
          this.core.emitAndWrite({
            filterPlugin: (plugin) => plugin.name === 'vite',
          });
        }
      });
    },
    emit() {
      const out: EmitEntry[] = [];
      if (indexOptions === false) return out;

      if (indexOptions.browser) {
        out.push({
          path: 'browser.ts',
          content: indexFile(this, config, indexOptions, 'browser'),
        });
      }

      out.push({
        path: 'index.ts',
        content: indexFile(
          this,
          config,
          indexOptions,
          indexOptions.browser ? 'server' : 'all',
        ),
      });

      return out;
    },
  };
}

function applyDefaults(options: IndexFileOptions): Required<IndexFileOptions> {
  return {
    addJsExtension: options.addJsExtension ?? false,
    browser: options.browser ?? false,
    runtime: options.runtime ?? false,
  };
}

function indexFile(
  { configPath, outDir }: PluginContext,
  config: LoadedConfig,
  { addJsExtension, runtime }: Required<IndexFileOptions>,
  environment: 'all' | 'browser' | 'server',
) {
  const runtimePath = {
    all: 'fumadocs-mdx/runtime/vite',
    server: 'fumadocs-mdx/runtime/vite.server',
    browser: 'fumadocs-mdx/runtime/vite.browser',
  }[environment];

  const lines = [
    '/// <reference types="vite/client" />',
    `import { fromConfig } from '${runtimePath}';`,
    `import type * as Config from '${toImportPath(configPath, {
      relativeTo: outDir,
      jsExtension: addJsExtension,
    })}';`,
    '',
    `export const create = fromConfig<typeof Config>();`,
  ];

  function generateCollectionGlob(collection: CollectionItem): string {
    if (collection.type === 'docs') {
      const obj = [
        ident(`doc: ${generateCollectionGlob(collection.docs)}`),
        ident(`meta: ${generateCollectionGlob(collection.meta)}`),
      ].join(',\n');

      return `{\n${obj}\n}`;
    }

    const dir = getCollectionDir(collection);
    if (collection.type === 'doc') {
      const docGlob = generateGlob(collection.patterns, {
        query: {
          collection: collection.name,
        },
        base: dir,
      });

      if (collection.async) {
        const headBlob = generateGlob(collection.patterns, {
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

    return `create.meta("${collection.name}", "${dir}", ${generateGlob(
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

  function generateGlob(patterns: string[], options: GlobImportOptions) {
    patterns = patterns.map(normalizeGlobPath);

    if (runtime === 'node' || runtime === 'bun') {
      return generateGlobImport(patterns, options);
    } else {
      return `import.meta.glob(${JSON.stringify(patterns)}, ${JSON.stringify(
        {
          ...options,
          base: normalizeGlobPath(path.relative(outDir, options.base)),
        },
        null,
        2,
      )})`;
    }
  }

  for (const collection of config.collectionList) {
    lines.push('');
    lines.push(
      `export const ${collection.name} = ${generateCollectionGlob(collection)};`,
    );
  }

  return lines.join('\n');
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
