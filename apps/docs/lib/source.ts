import { createMDXSource } from 'fumadocs-mdx/runtime/next';
import {
  type InferMetaType,
  type InferPageType,
  loader,
  multiple,
} from 'fumadocs-core/source';
import { openapiPlugin, openapiSource } from 'fumadocs-openapi/server';
import { blog as blogPosts, docs } from '@/.source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { openapi } from '@/lib/openapi';

export const source = loader(
  multiple({
    docs: docs.toFumadocsSource(),
    openapi: await openapiSource(openapi, {
      baseDir: 'openapi/(generated)',
    }),
  }),
  {
    baseUrl: '/docs',
    plugins: [lucideIconsPlugin(), openapiPlugin()],
  },
);

export const blog = loader(createMDXSource(blogPosts), {
  baseUrl: '/blog',
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
