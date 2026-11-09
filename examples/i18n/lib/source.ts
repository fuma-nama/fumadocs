import { loader } from 'fumadocs-core/source';
import { i18n } from '@/lib/i18n';
import { defineDocs } from 'fumadocs-mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    analysis: 'runtime',
  },
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  i18n,
});
