import type { MdastPluginDefinition } from 'satteri';
import { defineCollections } from 'fumadocs-mdx/macro';
import type { SatteriPresetOptions } from '@fumadocs/satteri/preset';
import { rehypeCodeFromHighlighter } from '@fumadocs/satteri/rehype-code';
import { rehypeCodeDefaultOptions } from 'fumadocs-core/mdx-plugins/rehype-code.core';
import { transformerTwoslash } from 'fumadocs-twoslash';
import { createFileSystemTypesCache } from 'fumadocs-twoslash/cache-fs';
import { z } from 'zod';
import { highlighter } from '@/lib/highlighter';

declare module 'satteri' {
  interface DataMap {
    raw?: string;
  }
}

/** keeps the authored source of a file, so the editor shows what was compiled */
function remarkRaw(): MdastPluginDefinition {
  return {
    name: 'remark-raw',
    before(_root, ctx) {
      ctx.data.raw = ctx.source.trim();
    },
  };
}

/**
 * The blocks of `quick-start.mdx`, one file each so each lands on its own slot. Fumadocs MDX
 * compiles them like the docs: the site's highlighter, code notations and Twoslash.
 */
export const quickStart = defineCollections({
  type: 'doc',
  dir: 'app/(landing)/sections/write/content',
  compiler: 'satteri',
  schema: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
  }),
  postprocess: { valueToExport: ['raw'] },
  satteriOptions(): SatteriPresetOptions {
    return {
      rehypeCodeOptions: false,
      mdastPlugins: [remarkRaw()],
      hastPlugins: [
        rehypeCodeFromHighlighter(
          ({ transformers }) => highlighter.override({ shikiTransformers: transformers }),
          {
            transformers: [
              ...(rehypeCodeDefaultOptions().transformers ?? []),
              transformerTwoslash({
                typesCache: createFileSystemTypesCache(),
                // a failed analysis leaves the block highlighted, it never fails the page
                throws: false,
                // `@/` is the docs app, as in its own files
                twoslashOptions: { compilerOptions: { paths: { '@/*': ['./*'] } } },
              }),
            ],
          },
        ),
      ],
    };
  },
});
