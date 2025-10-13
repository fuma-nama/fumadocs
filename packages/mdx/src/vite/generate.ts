import type {
  AnyCollection,
  DocCollection,
  DocsCollection,
  MetaCollection,
} from '@/config';
import { ident, toImportPath } from '@/utils/import-formatter';
import type { LoadedConfig } from '@/loaders/config';
import { getGlobPatterns } from '@/utils/collections';
import path from 'node:path';

export interface GlobOptions {
  query: Record<string, string>;
  base?: string;
  import?: string;
}

export interface IndexFileOptions {
  /**
   * Runtime compat fallbacks
   */
  runtime?: 'bun';

  /**
   * Output index file path
   *
   * @defaultValue 'source.generated.ts'
   */
  out?: string;

  /**
   * add `.js` extensions to imports, needed for ESM without bundler resolution
   */
  addJsExtension?: boolean;
}

export function entry(
  configPath: string,
  config: LoadedConfig,
  options: IndexFileOptions,
) {
  const {
    out = 'source.generated.ts',
    addJsExtension = false,
    runtime,
  } = options;
  const outDir = path.dirname(out);

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
    const docGlob = generateGlob(name, patterns, {
      base,
    });

    if (collection.async) {
      const headBlob = generateGlob(name, patterns, {
        query: {
          only: 'frontmatter',
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

    return `create.meta("${name}", "${base}", ${generateGlob(name, patterns, {
      import: 'default',
      base,
    })})`;
  }

  function generateGlob(
    name: string,
    patterns: string[],
    globOptions?: Partial<GlobOptions>,
  ) {
    const options: GlobOptions = {
      ...globOptions,
      query: {
        ...globOptions?.query,
        collection: name,
      },
    };

    const fnName = runtime === 'bun' ? 'importMetaGlob' : 'import.meta.glob';
    return `${fnName}(${JSON.stringify(mapGlobPatterns(patterns))}, ${JSON.stringify(options, null, 2)})`;
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
