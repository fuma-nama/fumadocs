import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'test/fixtures/generate-index-docs',
  docs: {
    schema: z.object({ title: z.string().default('Hello World') }),
    mdxOptions: { rehypePlugins: [] },
    lastModified: true,
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: 'test/fixtures/generate-index',
  async: true,
  postprocess: { extractLinkReferences: true },
  lastModified: true,
});

export const metaOnly = defineCollections({
  type: 'meta',
  dir: 'test/fixtures/generate-index',
  schema: z.object({ pages: z.array(z.string()).optional() }),
});
