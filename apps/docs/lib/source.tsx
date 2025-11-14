import {
  type InferMetaType,
  type InferPageType,
  type LoaderPlugin,
  MetaData,
  Source,
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
    plugins: [pageTreeCodeTitles(), lucideIconsPlugin(), openapiPlugin()],
  },
);

function pageTreeCodeTitles(): LoaderPlugin {
  return {
    transformPageTree: {
      file(node) {
        if (
          typeof node.name === 'string' &&
          (node.name.endsWith('()') || node.name.match(/^<\w+ \/>$/))
        ) {
          return {
            ...node,
            name: <code className="text-[13px]">{node.name}</code>,
          };
        }
        return node;
      },
    },
  };
}

export const blog = loader(
  {
    files: blogPosts.map((post) => ({
      type: 'page',
      data: post,
      path: post.info.path,
      absolutePath: post.info.fullPath,
    })),
  } as Source<{
    metaData: MetaData;
    pageData: (typeof blogPosts)[number];
  }>,
  {
    baseUrl: '/blog',
  },
);

export type Page = InferPageType<typeof source>;
export type Meta = InferMetaType<typeof source>;
