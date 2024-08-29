import {
  defineDocs,
  defineCollections,
  defineConfig,
} from 'fumadocs-mdx/config';
import { z } from 'zod';
import React from 'react';
import Markdown from 'react-markdown';

export const { docs, meta } = defineDocs({
  docs: {
    async transform(entry) {
      const { useMDXComponents } = await import('./mdx-components');
      return {
        ...entry,
        description_md: React.createElement(Markdown, {
          // @ts-expect-error -- different types
          components: useMDXComponents({}),
          children: entry.description,
        }),
      };
    },
  },
});

export const blog = defineCollections({
  type: 'doc',
  dir: './content/blog',
  schema: z.object({
    title: z.string(),
  }),
});

export default defineConfig({
  mdxOptions: {},
});
