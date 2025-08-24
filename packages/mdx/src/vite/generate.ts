import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import { ident } from '@/utils/import-formatter';
import { generateGlob } from '@/vite/generate-glob';

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
