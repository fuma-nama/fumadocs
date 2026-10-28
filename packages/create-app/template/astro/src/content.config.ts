import { defineCollection } from 'astro:content';
import { metaLoader, pageLoader } from '@fumadocs/astro/loaders';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

export const collections = {
  docs: defineCollection({ loader: pageLoader(), schema: pageSchema }),
  meta: defineCollection({ loader: metaLoader(), schema: metaSchema }),
};
