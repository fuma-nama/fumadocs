import type {
  AnyCollection,
  DocCollection,
  DocsCollection,
  MetaCollection,
} from '@/config';
import { ident, toImportPath } from '@/utils/import-formatter';
import type { LoadedConfig } from '@/loaders/config';
import { getGlobPatterns } from '@/utils/collections';
import {
  generateGlobImport,
  type GlobImportOptions,
} from '@/utils/glob-import';
import type { Plugin } from '@/core';
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
}

export default function vite(options: IndexFileOptions): Plugin {
  let config: LoadedConfig;

  return {
    config(v) {
      config = v;
    },
    emit() {
      return [
        {
          path: 'index.ts',
          content: indexFile(this.configPath, this.outDir, config, options),
        },
      ];
    },
  };
}

function indexFile(
  configPath: string,
  outDir: string,
  config: LoadedConfig,
  options: IndexFileOptions,
) {
  const { addJsExtension = false, runtime } = options;

  const lines = [
    '/// <reference types="vite/client" />',
    `import { fromConfig } from 'fumadocs-mdx/runtime/vite';`,
    `import type * as Config from '${toImportPath(configPath, {
      relativeTo: outDir,
      jsExtension: addJsExtension,
    })}';`,
    '',
    `export const create = fromConfig<typeof Config>();`,
  ];

  function docs(name: string, collection: DocsCollection) {
    const obj = [
      ident(`doc: ${doc(name, collection.docs)}`),
      ident(`meta: ${meta(name, collection.meta)}`),
    ].join(',\n');

    return `{\n${obj}\n}`;
  }

  function doc(name: string, collection: DocCollection) {
    const patterns = getGlobPatterns(collection);
    const dir = getCollectionDir(collection);
    const docGlob = generateGlob(patterns, {
      query: {
        collection: name,
      },
      base: dir,
    });

    if (collection.async) {
      const headBlob = generateGlob(patterns, {
        query: {
          only: 'frontmatter',
          collection: name,
        },
        import: 'frontmatter',
        base: dir,
      });

      return `create.docLazy("${name}", "${dir}", ${headBlob}, ${docGlob})`;
    }

    return `create.doc("${name}", "${dir}", ${docGlob})`;
  }

  function meta(name: string, collection: MetaCollection) {
    const patterns = getGlobPatterns(collection);
    const dir = getCollectionDir(collection);

    return `create.meta("${name}", "${dir}", ${generateGlob(patterns, {
      import: 'default',
      base: dir,
      query: {
        collection: name,
      },
    })})`;
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

  for (const [name, collection] of config.collections.entries()) {
    let body: string;

    if (collection.type === 'docs') {
      body = docs(name, collection);
    } else if (collection.type === 'meta') {
      body = meta(name, collection);
    } else {
      body = doc(name, collection);
    }

    lines.push('');
    lines.push(`export const ${name} = ${body};`);
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

function getCollectionDir(collection: AnyCollection): string {
  const dir = collection.dir;

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
