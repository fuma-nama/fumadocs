import { defineConfig, defineDocs } from 'fumadocs-mdx/config';

export const docs = defineDocs({
  dir: 'content/docs',
  baseUrl: '/docs',
  // Add this option to disable the base option in globs
  rootDir: 'content', 
});

export default defineConfig({
  // Set rootDir to match the directory structure
  rootDir: 'content',
});