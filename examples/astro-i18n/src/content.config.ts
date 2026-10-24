import { defineCollection } from 'astro:content';
import { docsLoader, metaLoader } from '@fumadocs/astro/loaders';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';

export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: pageSchema }),
  meta: defineCollection({ loader: metaLoader(), schema: metaSchema }),
};
