import { defineCollection, defineConfig } from '@content-collections/core';
import {
  createMetaSchema,
  createDocSchema,
  transformMDX,
} from '@fumadocs/content-collections/configuration';

const docs = defineCollection({
  name: 'docs',
  directory: 'content/docs',
  include: '**/*.mdx',
  schema: createDocSchema,
  transform: (document, context) =>
    transformMDX(document, context, {
      rehypeCodeOptions: {
        themes: {
          light: 'catppuccin-latte',
          dark: 'catppuccin-mocha',
        },
      },
    }),
});

const metas = defineCollection({
  name: 'meta',
  directory: 'content/docs',
  include: '**/meta.json',
  parser: 'json',
  schema: createMetaSchema,
});

export default defineConfig({
  collections: [docs, metas],
});
