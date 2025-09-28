/// <reference types="fumadocs-mdx" />
import { loader } from 'fumadocs-core/source';
import { create, docs } from '../config/source.generated';

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/docs',
});
