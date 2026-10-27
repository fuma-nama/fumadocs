import { defineCollections } from 'fumadocs-mdx/macro';
import type { SatteriPresetOptions } from '@fumadocs/satteri/preset';
import { rehypeCodeFromHighlighter } from '@fumadocs/satteri/rehype-code';
import { remarkAutoTypeTable } from '@fumadocs/satteri/remark-auto-type-table';
import { createFileSystemGeneratorCache, createGenerator } from 'fumadocs-typescript';
import { apiHighlighter, highlighter } from '@/lib/highlighter';
import { frontmatter, remarkRaw, sourcesOf } from '../write/data';

/** each block of `button.mdx`: the tab the arm grips, the status line while it's pressed */
export const steps = [
  { tab: '---', status: 'rendering <DocsTitle>' },
  { tab: '<include>', status: 'including button.tsx' },
  { tab: '<auto-type-table />', status: 'generating ButtonProps' },
  { tab: '<Releases />', status: 'running <Releases>' },
];

/** the blocks of `button.mdx`, a file each for a plate each, compiled like the docs */
export const button = defineCollections({
  type: 'doc',
  dir: 'app/(landing)/sections/automate/content',
  compiler: 'satteri',
  schema: frontmatter,
  postprocess: { valueToExport: ['raw'] },
  satteriOptions(): SatteriPresetOptions {
    return {
      rehypeCodeOptions: false,
      mdastPlugins: [
        remarkRaw(),
        // as the docs make their type tables
        remarkAutoTypeTable({
          generator: createGenerator({
            cache: createFileSystemGeneratorCache('.next/cache/fumadocs-typescript'),
          }),
          highlighter: apiHighlighter,
        }),
      ],
      hastPlugins: [rehypeCodeFromHighlighter(highlighter)],
    };
  },
});

export const blocks = sourcesOf(button.entries);
