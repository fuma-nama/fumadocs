import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

// Options: https://fumadocs.dev/docs/mdx/collections#define-docs
export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    // MDX options
  },
});
