import { defineDocs, defineCollections } from 'fumadocs-mdx/config';
import { z } from 'zod';

export const { docs, meta } = defineDocs();

export const blog = defineCollections({
  type: 'doc',
  dir: './content/blog',
  schema: z.object({
    title: z.string(),
  }),
});
