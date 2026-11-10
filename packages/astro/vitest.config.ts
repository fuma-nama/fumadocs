import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: path.resolve(import.meta.dirname, 'src') },
      // the frontmatter in code of a file, the tests write its module next to it
      { find: /^(.+\.mdx)\?fumadocs-frontmatter&lang\.ts$/, replacement: '$1.ts' },
    ],
  },
  test: {
    environment: 'node',
  },
});
