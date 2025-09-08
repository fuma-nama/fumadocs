import { defineCollection, defineConfig } from '@content-collections/core';
import {
  frontmatterSchema,
  metaSchema,
  transformMDX,
} from '@fumadocs/content-collections/configuration';

const docs = defineCollection({
  name: 'docs',
  directory: 'content/docs',
  include: '**/*.mdx',
  schema: frontmatterSchema,
  transform: transformMDX,
});

const metas = defineCollection({
  name: 'meta',
  directory: 'content/docs',
  include: '**/meta.json',
  parser: 'json',
  schema: metaSchema,
});

export default defineConfig({
  collections: [docs, metas],
});
