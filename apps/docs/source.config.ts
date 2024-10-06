import {
  defineConfig,
  defineDocs,
  defineCollections,
  frontmatterSchema,
  metaSchema,
} from 'fumadocs-mdx/config';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins';
import { transformerTwoslash } from 'fumadocs-twoslash';
import remarkMath from 'remark-math';
import {
  fileGenerator,
  remarkDocGen,
  remarkInstall,
  typescriptGenerator,
} from 'fumadocs-docgen';
import rehypeKatex from 'rehype-katex';
import { z } from 'zod';

export const { docs, meta } = defineDocs({
  docs: {
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
  dir: 'content/blog',
  schema: frontmatterSchema.extend({
    author: z.string(),
    date: z.string().date().or(z.date()).optional(),
  }),
  type: 'doc',
});

export default defineConfig({
  lastModifiedTime: 'git',
  mdxOptions: {
    rehypeCodeOptions: {
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
      remarkMath,
      [remarkInstall, { persist: { id: 'package-manager' } }],
      [remarkDocGen, { generators: [fileGenerator()] }],
    ],
    rehypePlugins: (v) => [rehypeKatex, ...v],
  },
});
