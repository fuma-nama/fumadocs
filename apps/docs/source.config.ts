import {
  defineCollections,
  defineConfig,
  defineDocs,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { z } from 'zod';
import type { ElementContent } from 'hast';
import jsonSchema from 'fumadocs-mdx/plugins/json-schema';
import lastModified from 'fumadocs-mdx/plugins/last-modified';
import type { ShikiTransformer } from 'shiki';

export const docs = defineDocs({
  docs: {
    schema: frontmatterSchema.extend({
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
    },
    async: true,
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
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.iso.date().or(z.date()),
  }),
  async: true,
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
  mdxOptions: async () => {
    const { rehypeCodeDefaultOptions } = await import(
      'fumadocs-core/mdx-plugins/rehype-code'
    );
    const { remarkSteps } = await import(
      'fumadocs-core/mdx-plugins/remark-steps'
    );
    const { transformerTwoslash } = await import('fumadocs-twoslash');
    const { createFileSystemTypesCache } = await import(
      'fumadocs-twoslash/cache-fs'
    );
    const { default: remarkMath } = await import('remark-math');
    const { remarkTypeScriptToJavaScript } = await import(
      'fumadocs-docgen/remark-ts2js'
    );
    const { default: rehypeKatex } = await import('rehype-katex');
    const { remarkAutoTypeTable } = await import('fumadocs-typescript');

    return {
      rehypeCodeOptions: {
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
      remarkPlugins: [
        remarkSteps,
        remarkMath,
        remarkAutoTypeTable,
        remarkTypeScriptToJavaScript,
      ],
      rehypePlugins: (v) => [rehypeKatex, ...v],
    };
  },
});
