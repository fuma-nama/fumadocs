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
import type { Plugin } from '@/plugins';

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
      console.log('[Fumadocs MDX] Generating index files');

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

  if (runtime === 'bun') {
    lines.push(`import { importMetaGlob } from 'fumadocs-mdx/bun';`);
  }

  function docs(name: string, collection: DocsCollection) {
    const obj = [
      ident(`doc: ${doc(name, collection.docs)}`),
      ident(`meta: ${meta(name, collection.meta)}`),
    ].join(',\n');

    return `{\n${obj}\n}`;
  }

  function doc(name: string, collection: DocCollection) {
    const patterns = getGlobPatterns(collection);
    const base = getGlobBase(collection);
    const docGlob = generateGlob(patterns, {
      query: {
        collection: name,
      },
      base,
    });

    if (collection.async) {
      const headBlob = generateGlob(patterns, {
        query: {
          only: 'frontmatter',
          collection: name,
        },
        import: 'frontmatter',
        base,
      });

      return `create.docLazy("${name}", "${base}", ${headBlob}, ${docGlob})`;
    }

    return `create.doc("${name}", "${base}", ${docGlob})`;
  }

  function meta(name: string, collection: MetaCollection) {
    const patterns = getGlobPatterns(collection);
    const base = getGlobBase(collection);

    return `create.meta("${name}", "${base}", ${generateGlob(patterns, {
      import: 'default',
      base,
      query: {
        collection: name,
      },
    })})`;
  }

  function generateGlob(patterns: string[], options: GlobImportOptions) {
    patterns = mapGlobPatterns(patterns);

    if (runtime === 'node') {
      return generateGlobImport(patterns, options);
    } else {
      const fnName = runtime === 'bun' ? 'importMetaGlob' : 'import.meta.glob';

      return `${fnName}(${JSON.stringify(patterns)}, ${JSON.stringify(options, null, 2)})`;
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

function mapGlobPatterns(patterns: string[]) {
  return patterns.map(enforceRelative);
}

function enforceRelative(file: string) {
  if (file.startsWith('./')) return file;
  if (file.startsWith('/')) return `.${file}`;

  return `./${file}`;
}

function getGlobBase(collection: AnyCollection) {
  let dir = collection.dir;

  if (Array.isArray(dir)) {
    if (dir.length !== 1)
      throw new Error(
        `[Fumadocs MDX] Vite Plugin doesn't support multiple \`dir\` for a collection at the moment.`,
      );

    dir = dir[0];
  }

  return enforceRelative(dir);
}
