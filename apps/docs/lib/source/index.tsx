import { type LoaderPlugin, loader } from 'fumadocs-core/source';
import { lucideIconsPlugin } from 'fumadocs-core/source/lucide-icons';
import { openapi } from '@/lib/openapi';
import { asyncapi } from '../asyncapi';
import { defineCollections, defineDocs } from 'fumadocs-mdx/macro';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import z from 'zod';
import {
  createFileSystemGeneratorCache,
  createGenerator,
  RemarkAutoTypeTableOptions,
} from 'fumadocs-typescript';
import { defaultShikiOptions } from '../shiki';
import type { ShikiTransformer } from 'shiki';
import type { ElementContent } from 'hast';
import { remarkSteps } from '@fumadocs/satteri/remark-steps';
import { remarkBlockId } from '@fumadocs/satteri/remark-block-id';
import { remarkTs2js } from '@fumadocs/satteri/remark-ts2js';
import { remarkAutoTypeTable } from '@fumadocs/satteri/remark-auto-type-table';
import { Nodes } from 'mdast';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';
import type { MdastPluginDefinition } from 'satteri';

const typeTableGenerator = createGenerator({
  cache: createFileSystemGeneratorCache('.next/cache/fumadocs-typescript'),
});

const isLint = process.env.LINT === '1';

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
        shiki: defaultShikiOptions,
      };

      return {
        features: {
          math: true,
        },
        rehypeCodeOptions: isLint
          ? false
          : {
              inline: 'tailing-curly-colon',
              themes: {
                light: 'catppuccin-latte',
                dark: 'catppuccin-mocha',
              },
              transformers: [
                ...(rehypeCodeDefaultOptions.transformers ?? []),
                transformerTwoslash({
                  typesCache: createFileSystemTypesCache(),
                  twoslashOptions: {
                    compilerOptions: {
                      types: ['@types/node'],
                    },
                  },
                }),
                transformerEscape(),
              ],
            },
        remarkCodeTabOptions: {
          parseMdx: true,
        },
        remarkStructureOptions: {
          stringify: {
            filterElement(node: Nodes) {
              switch (node.type) {
                case 'mdxJsxFlowElement':
                case 'mdxJsxTextElement':
                  switch (node.name) {
                    case 'File':
                    case 'TypeTable':
                    case 'Callout':
                    case 'Card':
                    case 'Custom':
                      return true;
                  }
                  return 'children-only';
              }

              return true;
            },
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
  schema: pageSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
  async: true,
  async satteriOptions() {
    const { rehypeCodeDefaultOptions } = await import('fumadocs-core/mdx-plugins/rehype-code');

    return {
      rehypeCodeOptions: isLint
        ? false
        : {
            inline: 'tailing-curly-colon',
            themes: {
              light: 'catppuccin-latte',
              dark: 'catppuccin-mocha',
            },
            transformers: [...(rehypeCodeDefaultOptions.transformers ?? []), transformerEscape()],
          },
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
  },
  {
    baseUrl: '/docs',
    plugins: [
      pageTreeCodeTitles(),
      lucideIconsPlugin(),
      openapi.loaderPlugin(),
      asyncapi.loaderPlugin(),
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

export type Page = (typeof source)['$inferPage'];
export type Meta = (typeof source)['$inferMeta'];
