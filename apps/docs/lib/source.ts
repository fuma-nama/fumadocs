import { createMDXSource } from 'fumadocs-mdx/runtime/next';
import {
  type InferMetaType,
  type InferPageType,
  loader,
} from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { blog as blogPosts, docs } from '@/.source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { openapi } from '@/lib/openapi';

export const source = loader(docs.toFumadocsSource(), {
  baseUrl: '/docs',
  plugins: [
    lucideIconsPlugin(),
    await openapiPlugin.withPages({
      from: openapi,
      baseDir: 'openapi/(generated)',
    }),
  ],
});

export const blog = loader(createMDXSource(blogPosts), {
  baseUrl: '/blog',
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
