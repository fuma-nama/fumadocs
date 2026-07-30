import { loader } from 'fumadocs-core/source';
import { defineDocs } from 'fumadocs-mdx/macro';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
});
