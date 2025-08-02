import { loader } from 'fumadocs-core/source';
import { create, docs } from '../source.generated.js';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
});
