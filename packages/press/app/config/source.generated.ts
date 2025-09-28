import { fromConfig } from 'fumadocs-mdx/runtime/vite';
import type * as Config from './fumadocs-mdx';

export const create = fromConfig<typeof Config>();

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
