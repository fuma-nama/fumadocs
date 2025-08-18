import { loader } from 'fumadocs-core/source';
import { create, docs } from '../../source.generated';
import { i18n } from '@/lib/i18n';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
  i18n,
});
