/// <reference types="fumadocs-mdx" />
import { type InferPageType, loader } from 'fumadocs-core/source';
import { fromConfig } from 'fumadocs-mdx/runtime/server';
import type { FumadocsMDXConfig } from '../config/content.js';

const create = fromConfig<FumadocsMDXConfig>();

export const docs = await create.docsLazy(
  'docs',
  './content',
  import.meta.glob(['./**/*.{json,yaml}'], {
    import: 'default',
    base: '/content',
    eager: true,
    query: {
      collection: 'docs',
    },
  }),
  import.meta.glob(['./**/*.{mdx,md}'], {
    import: 'frontmatter',
    base: '/content',
    query: {
      collection: 'docs',
      only: 'frontmatter',
    },
    eager: true,
  }),
  import.meta.glob(['./**/*.{mdx,md}'], {
    base: '/content',
    query: {
      collection: 'docs',
    },
  }),
);

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: '/',
});

export type Page = InferPageType<typeof source>;
