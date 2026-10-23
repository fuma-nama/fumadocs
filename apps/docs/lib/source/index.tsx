import { type LoaderPlugin, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { openapi } from '@/lib/openapi';
import { asyncapi } from '../asyncapi';
import { graphql } from '../graphql';
import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import z from 'zod';
import {
  createFileSystemGeneratorCache,
  createGenerator,
  RemarkAutoTypeTableOptions,
} from 'fumadocs-typescript';
import { apiHighlighter } from '../highlighter';
import type { ShikiTransformer } from 'shiki';
import type { ElementContent } from 'hast';
import { remarkSteps } from '@fumadocs/satteri/remark-steps';
import { remarkBlockId } from '@fumadocs/satteri/remark-block-id';
import { remarkTs2js } from '@fumadocs/satteri/remark-ts2js';
import { remarkFeature } from '@/lib/remark-feature';
import { type BlogAuthor, blogPageSchema } from '@/lib/blog';
import { remarkAutoTypeTable } from '@fumadocs/satteri/remark-auto-type-table';
import { createHighlights } from 'fumadocs-core/highlight/highlights';
import { rehypeCodeFromHighlighter } from '@fumadocs/satteri/rehype-code';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code.core';
import catppuccinLatte from '@pierre/highlights/themes/catppuccin-latte';
import catppuccinMocha from '@pierre/highlights/themes/catppuccin-mocha';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';
import type { MdastPluginDefinition } from 'satteri';

const typeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/cache/fumadocs-typescript'),
});

const isLint = process.env.LINT === '1';
const contentHighlighter = createHighlights({
  themes: { light: catppuccinLatte, dark: catppuccinMocha },
});

declare module 'satteri' {
  interface DataMap {
    elementIds?: string[];
  }
}

/** Docs lint only — collects JSX `id` attributes for link validation. */
function remarkElementIds(): MdastPluginDefinition {
  return {
    name: 'remark-element-ids',
    mdxJsxFlowElement(node, ctx) {
      if (!node.name || !node.attributes) return;

      const idAttr = node.attributes.find(
        (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );
      if (!idAttr || typeof idAttr.value !== 'string') return;

      const ids = (ctx.data.elementIds ??= []);
      ids.push(idAttr.value);
    },
  };
}

const docs = defineDocs({
  docs: {
    compiler: 'satteri',
    schema: pageSchema.extend({
      preview: z.string().optional(),
      index: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
    }),
    postprocess: {
      includeProcessedMarkdown: true,
      extractLinkReferences: true,
      valueToExport: ['elementIds'],
    },
    async: true,
    lastModified: true,
    satteriOptions() {
      const typeTableOptions: RemarkAutoTypeTableOptions = {
        generator: typeTableGenerator,
        highlighter: apiHighlighter,
      };

      return {
        features: {
          math: true,
        },
        rehypeCodeOptions: false,
        hastPlugins: isLint
          ? []
          : [
              rehypeCodeFromHighlighter(
                ({ transformers }) =>
                  contentHighlighter.override({
                    shikiTransformers: [...transformers, transformerEscape()],
                  }),
                {
                  inline: 'tailing-curly-colon',
                  transformers: [
                    ...(rehypeCodeDefaultOptions().transformers ?? []),
                    transformerTwoslash({
                      typesCache: createFileSystemTypesCache(),
                      twoslashOptions: {
                        compilerOptions: {
                          types: ['@types/node'],
                        },
                      },
                    }),
                  ],
                },
              ),
            ],
        remarkCodeTabOptions: {
          parseMdx: true,
        },
        remarkStructureOptions: {
          filterElement(node) {
            switch (node.name) {
              case 'File':
              case 'TypeTable':
              case 'Callout':
              case 'Card':
              case 'Custom':
                return true;
              default:
                return false;
            }
          },
        },
        remarkImageOptions: isLint ? false : undefined,
        remarkNpmOptions: {
          persist: {
            id: 'package-manager',
          },
        },
        mdastPlugins: (plugins) =>
          isLint
            ? [remarkElementIds(), ...plugins]
            : [
                remarkSteps(),
                remarkBlockId({ addDataAttribute: 'feedback' }),
                remarkAutoTypeTable(typeTableOptions),
                remarkTs2js(),
                remarkFeature(),
                ...plugins,
              ],
      };
    },
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

const blog = defineCollections({
  type: 'doc',
  compiler: 'satteri',
  dir: 'content/blog',
  schema: blogPageSchema.extend({
    date: z.iso.date().or(z.date()),
    /** Open Graph image, defaults to the site banner */
    ogImage: z.string().optional(),
  }),
  async: true,
  async satteriOptions() {
    return {
      rehypeCodeOptions: false,
      hastPlugins: isLint
        ? []
        : [
            rehypeCodeFromHighlighter(
              ({ transformers }) =>
                contentHighlighter.override({
                  shikiTransformers: [...transformers, transformerEscape()],
                }),
              { inline: 'tailing-curly-colon' },
            ),
          ],
      remarkCodeTabOptions: {
        parseMdx: true,
      },
      remarkImageOptions: isLint ? false : undefined,
      remarkNpmOptions: {
        persist: {
          id: 'package-manager',
        },
      },
      mdastPlugins: (plugins) =>
        isLint ? [remarkElementIds(), ...plugins] : [remarkSteps(), ...plugins],
    };
  },
});

export const source = loader(
  {
    docs: docs.toFumadocsSource(),
    openapi: await openapi.staticSource({
      baseDir: 'openapi/(generated)',
      meta: {
        folderStyle: 'separator',
      },
      groupBy: 'tag',
    }),
    asyncapi: await asyncapi.staticSource({
      baseDir: 'asyncapi/(generated)',
      meta: {
        folderStyle: 'separator',
      },
      groupBy: 'tag',
    }),
    graphql: await graphql.staticSource({
      baseDir: 'graphql/(generated)',
      meta: {
        folderStyle: 'separator',
      },
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [
      pageTreeCodeTitles(),
      lucideIconsPlugin(),
      openapi.loaderPlugin(),
      asyncapi.loaderPlugin(),
      graphql.loaderPlugin(),
    ],
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
            name: (
              <code key="0" className="text-[0.8125rem]">
                {node.name}
              </code>
            ),
          };
        }
        return node;
      },
    },
  };
}

function transformerEscape(): ShikiTransformer {
  return {
    name: '@shikijs/transformers:remove-notation-escape',
    code(hast) {
      function replace(node: ElementContent) {
        if (node.type === 'text') {
          node.value = node.value.replace('[\\!code', '[!code');
        } else if ('children' in node) {
          for (const child of node.children) {
            replace(child);
          }
        }
      }

      replace(hast);
      return hast;
    },
  };
}

export const blogLoader = loader(blog.toFumadocsSource(), {
  baseUrl: '/blog',
});

export const blogAuthors: Record<string, BlogAuthor> = {
  fuma: {
    name: 'Fuma Nama',
    title: 'Maintainer',
    url: 'https://fuma-nama.dev',
    image: 'https://avatars.githubusercontent.com/u/76240755',
  },
};

export type Page = (typeof source)['$inferPage'];
export type Meta = (typeof source)['$inferMeta'];
