import { defineCollection } from 'astro:content';
import { metaLoader, pageLoader } from '@fumadocs/astro/loaders';

export const collections = {
  docs: defineCollection({ loader: pageLoader() }),
  meta: defineCollection({ loader: metaLoader() }),
};
