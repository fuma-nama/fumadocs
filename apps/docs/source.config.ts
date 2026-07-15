import { defineConfig } from 'fumadocs-mdx/config';
import jsonSchema from 'fumadocs-mdx/plugins/json-schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';

export default defineConfig({
  compiler: 'satteri',
  plugins: [
    jsonSchema({
      insert: true,
    }),
    lastModified(),
  ],
});
