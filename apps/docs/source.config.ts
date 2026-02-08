import { applyMdxPreset, defineCollections, defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { z } from 'zod';
import type { ElementContent } from 'hast';
import jsonSchema from 'fumadocs-mdx/plugins/json-schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import type { ShikiTransformer } from 'shiki';
import type { RemarkFeedbackBlockOptions } from 'fumadocs-core/mdx-plugins';
import type { RemarkAutoTypeTableOptions } from 'fumadocs-typescript';
import { shikiConfig } from './lib/shiki';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'mdast';

const isLint = process.env.LINT === '1';

export const docs = defineDocs({
  docs: {
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
    async mdxOptions(environment) {
      const { rehypeCodeDefaultOptions } = await import('fumadocs-core/mdx-plugins/rehype-code');
      const { remarkStructureDefaultOptions } =
        await import('fumadocs-core/mdx-plugins/remark-structure');
      const { remarkSteps } = await import('fumadocs-core/mdx-plugins/remark-steps');
      const { remarkFeedbackBlock } =
        await import('fumadocs-core/mdx-plugins/remark-feedback-block');
      const { transformerTwoslash } = await import('fumadocs-twoslash');
      const { createFileSystemTypesCache } = await import('fumadocs-twoslash/cache-fs');
      const { default: remarkMath } = await import('remark-math');
      const { remarkTypeScriptToJavaScript } = await import('fumadocs-docgen/remark-ts2js');
      const { default: rehypeKatex } = await import('rehype-katex');
      const { remarkAutoTypeTable, createGenerator, createFileSystemGeneratorCache } =
        await import('fumadocs-typescript');

      const feedbackOptions: RemarkFeedbackBlockOptions = {
        resolve(node) {
          // defensive approach
          if (node.type === 'mdxJsxFlowElement') return 'skip';
          return node.type === 'paragraph' || node.type === 'image' || node.type === 'list';
        },
      };
      const typeTableOptions: RemarkAutoTypeTableOptions = {
        generator: createGenerator({
          cache: createFileSystemGeneratorCache('.next/fumadocs-typescript'),
        }),
        shiki: shikiConfig,
      };
      return applyMdxPreset({
        remarkStructureOptions: {
          types: [...remarkStructureDefaultOptions.types, 'code'],
        },
        rehypeCodeOptions: isLint
          ? false
          : {
              langs: ['ts', 'js', 'html', 'tsx', 'mdx'],
              inline: 'tailing-curly-colon',
              themes: {
                light: 'catppuccin-latte',
                dark: 'catppuccin-mocha',
              },
              transformers: [
                ...(rehypeCodeDefaultOptions.transformers ?? []),
                transformerTwoslash({
                  typesCache: createFileSystemTypesCache(),
                }),
                transformerEscape(),
              ],
            },
        remarkCodeTabOptions: {
          parseMdx: true,
        },
        remarkNpmOptions: {
          persist: {
            id: 'package-manager',
          },
        },
        remarkPlugins: isLint
          ? [remarkElementIds]
          : [
              remarkSteps,
              remarkMath,
              [remarkFeedbackBlock, feedbackOptions],
              [remarkAutoTypeTable, typeTableOptions],
              remarkTypeScriptToJavaScript,
            ],
        rehypePlugins: (v) => [rehypeKatex, ...v],
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
  dir: 'content/blog',
  schema: pageSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
  async: true,
  async mdxOptions(environment) {
    const { rehypeCodeDefaultOptions } = await import('fumadocs-core/mdx-plugins/rehype-code');
    const { remarkSteps } = await import('fumadocs-core/mdx-plugins/remark-steps');

    return applyMdxPreset({
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
      remarkNpmOptions: {
        persist: {
          id: 'package-manager',
        },
      },
      remarkPlugins: isLint ? [remarkElementIds] : [remarkSteps],
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

function remarkElementIds(): Transformer<Root, Root> {
  return (tree, file) => {
    file.data ??= {};
    file.data.elementIds ??= [];

    visit(tree, 'mdxJsxFlowElement', (element) => {
      if (!element.name || !element.attributes) return;

      const idAttr = element.attributes.find(
        (attr) => attr.type === 'mdxJsxAttribute' && attr.name === 'id',
      );

      if (idAttr && typeof idAttr.value === 'string') {
        (file.data.elementIds as string[]).push(idAttr.value);
      }
    });
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
