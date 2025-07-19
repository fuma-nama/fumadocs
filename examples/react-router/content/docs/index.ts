import { fromConfig } from 'fumadocs-mdx/runtime/vite';
import type * as Config from '../../source.config';

export const create = fromConfig<typeof Config>();

export const docs = create.docs('docs', {
  doc: import.meta.glob('/content/docs/**/*.mdx', {
    query: {
      collection: 'docs',
    },
    base: '/content/docs',
  }),
  meta: import.meta.glob('/content/docs/**/*.json', {
    query: {
      collection: 'docs',
    },
    base: '/content/docs',
  }),
});
