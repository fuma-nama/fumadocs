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
  source: docs.toFumadocsSource(),
  baseUrl: '/docs',
  i18n,
});
