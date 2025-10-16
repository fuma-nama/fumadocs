/// <reference types="fumadocs-mdx" />
import { type InferPageType, loader } from 'fumadocs-core/source';
import { fromConfig } from 'fumadocs-mdx/runtime/vite';
import type { FumadocsMDXConfig } from '../config/content.js';

export const create = fromConfig<FumadocsMDXConfig>();

export const docs = {
  doc: create.doc(
    'docs',
    './content',
    import.meta.glob(['./**/*.{mdx,md}'], {
      base: '/content',
      query: {
        collection: 'docs',
      },
    }),
  ),
  meta: create.meta(
    'docs',
    './content',
    import.meta.glob(['./**/*.{json,yaml}'], {
      import: 'default',
      base: '/content',
      query: {
        collection: 'docs',
      },
    }),
  ),
};

export const source = loader({
  source: await create.sourceAsync(docs.doc, docs.meta),
  baseUrl: '/',
});

export type Page = InferPageType<typeof source>;
