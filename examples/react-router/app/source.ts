import { loader } from 'fumadocs-core/source';
import { create, docs } from '../content/docs';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
});
