import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { transformerTwoslash } from 'fumadocs-twoslash';
import remarkMath from 'remark-math';
import {
  fileGenerator,
  remarkDocGen,
  remarkInstall,
  remarkTypeScriptToJavaScript,
} from 'fumadocs-docgen';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';
import { remarkMermaid } from '@theguild/remark-mermaid';

export const { docs, meta } = defineDocs({
  docs: {
    async: true,
    schema: frontmatterSchema.extend({
      preview: z.string().optional(),
      index: z.boolean().default(false),
      /**
       * API routes only
       */
      method: z.string().optional(),
    }),
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
  async: true,
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()).optional(),
  }),
});

export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: async () => {
    const { rehypeCodeDefaultOptions } = await import(
      'fumadocs-core/mdx-plugins'
    );

    return {
      rehypeCodeOptions: {
        lazy: true,
        langs: ['ts', 'js', 'html'],
        inline: 'tailing-curly-colon',
        themes: {
          light: 'catppuccin-latte',
          dark: 'catppuccin-mocha',
        },
        transformers: [
          ...(rehypeCodeDefaultOptions.transformers ?? []),
          transformerTwoslash(),
          {
            name: 'transformers:remove-notation-escape',
            code(hast) {
              for (const line of hast.children) {
                if (line.type !== 'element') continue;

                const lastSpan = line.children.findLast(
                  (v) => v.type === 'element',
                );

                const head = lastSpan?.children[0];
                if (head?.type !== 'text') return;

                head.value = head.value.replace(/\[\\!code/g, '[!code');
              }
            },
          },
        ],
      },
      remarkPlugins: [
        remarkMermaid,
        remarkMath,
        [remarkInstall, { persist: { id: 'package-manager' } }],
        [remarkDocGen, { generators: [fileGenerator()] }],
        remarkTypeScriptToJavaScript,
      ],
      rehypePlugins: (v) => [rehypeKatex, ...v],
    };
  },
});
