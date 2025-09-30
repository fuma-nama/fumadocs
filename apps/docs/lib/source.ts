import { createMDXSource } from 'fumadocs-mdx/runtime/next';
import {
  type InferMetaType,
  type InferPageType,
  loader,
} from 'fumadocs-core/source';
import { openapiPlugin } from 'fumadocs-openapi/server';
import { blog as blogPosts, docs } from '@/.source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';

export const source = loader({
  baseUrl: '/docs',
  source: docs.toFumadocsSource(),
  plugins: [lucideIconsPlugin(), openapiPlugin()],
});

export const blog = loader({
  baseUrl: '/blog',
  source: createMDXSource(blogPosts),
});

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
