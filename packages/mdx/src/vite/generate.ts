import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import { ident, toImportPath } from '@/utils/import-formatter';
import { generateGlob } from '@/vite/generate-glob';
import type { LoadedConfig } from '@/utils/config';

export function docs(name: string, collection: DocsCollection) {
  const obj = [
    ident(`doc: ${doc(name, collection.docs)}`),
    ident(`meta: ${meta(name, collection.meta)}`),
  ].join(',\n');

  return `{\n${obj}\n}`;
}

export function doc(name: string, collection: DocCollection) {
  if (collection.async) {
    return `create.docLazy("${name}", ${generateGlob(name, collection, {
      query: {
        only: 'frontmatter',
      },
      import: 'frontmatter',
    })}, ${generateGlob(name, collection)})`;
  }

  return `create.doc("${name}", ${generateGlob(name, collection)})`;
}

export function meta(name: string, collection: MetaCollection) {
  return `create.meta("${name}", ${generateGlob(name, collection, {
    import: 'default',
  })})`;
}

export function entry(
  configPath: string,
  config: LoadedConfig,
  outDir: string,
  jsExtension?: boolean,
) {
  const lines = [
    '/// <reference types="vite/client" />',
    `import { fromConfig } from 'fumadocs-mdx/runtime/vite';`,
    `import type * as Config from '${toImportPath(configPath, {
      relativeTo: outDir,
      jsExtension,
    })}';`,
    '',
    `export const create = fromConfig<typeof Config>();`,
  ];

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
