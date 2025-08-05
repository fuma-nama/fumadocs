import { loader } from 'fumadocs-core/source';
import { create, docs } from '../source.generated';

export const source = loader({
  source: create.source(docs.doc, docs.meta),
  baseUrl: '/docs',
});
