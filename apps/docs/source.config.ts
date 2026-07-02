import { defineCollections, defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { z } from 'zod';
import type { ElementContent } from 'hast';
import jsonSchema from 'fumadocs-mdx/plugins/json-schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import type { ShikiTransformer } from 'shiki';
import type { RemarkAutoTypeTableOptions } from 'fumadocs-typescript';
import { defaultShikiOptions } from './lib/shiki.ts';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { applySatteriPreset } from '@fumadocs/satteri';
import {
  remarkBlockId,
  remarkElementIds,
  remarkSteps,
  rehypeKatex,
} from '@fumadocs/satteri';
import type { Nodes } from 'mdast';

const isLint = process.env.LINT === '1';

export const docs = defineDocs({
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
    async satteriOptions(environment) {
      const { rehypeCodeDefaultOptions } = await import('fumadocs-core/mdx-plugins/rehype-code');
      const { transformerTwoslash } = await import('fumadocs-twoslash');
      const { createFileSystemTypesCache } = await import('fumadocs-twoslash/cache-fs');
      const { remarkAutoTypeTableSatteri, createGenerator, createFileSystemGeneratorCache } =
        await import('fumadocs-typescript');
      const { remarkTypeScriptToJavaScriptSatteri } = await import('fumadocs-docgen/remark-ts2js');

      const typeTableOptions: RemarkAutoTypeTableOptions = {
        generator: createGenerator({
          cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
        }),
        shiki: defaultShikiOptions,
      };

      return applySatteriPreset({
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
                remarkSteps,
                remarkBlockId({ addDataAttribute: 'feedback' }),
                remarkAutoTypeTableSatteri(typeTableOptions),
                remarkTypeScriptToJavaScriptSatteri(),
                ...plugins,
              ],
        hastPlugins: (plugins) => [rehypeKatex(), ...plugins],
      })(environment);
    },
  },
  meta: {
    schema: metaSchema.extend({
      description: z.string().optional(),
    }),
  },
});

export const blog = defineCollections({
  type: 'doc',
  compiler: 'satteri',
  dir: 'content/blog',
  schema: pageSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
  async: true,
  async satteriOptions(environment) {
    const { rehypeCodeDefaultOptions } = await import('fumadocs-core/mdx-plugins/rehype-code');

    return applySatteriPreset({
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
        isLint ? [remarkElementIds(), ...plugins] : [remarkSteps, ...plugins],
    })(environment);
  },
});

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

export default defineConfig({
  plugins: [
    jsonSchema({
      insert: true,
    }),
    lastModified(),
  ],
});
