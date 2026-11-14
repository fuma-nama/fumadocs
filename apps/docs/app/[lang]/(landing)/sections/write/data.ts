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

/** a block on the press: what its tab calls it, the status line while it's pressed */
export interface Step {
  tab: string;
  status: string;
}

/** each block of `quick-start.mdx` */
export const steps: Step[] = [
  { tab: 'Frontmatter', status: 'rendering <DocsTitle>' },
  { tab: 'Install command', status: 'rendering <CodeBlockTabs>' },
  { tab: 'Type hints', status: 'running Twoslash' },
  { tab: 'Diagram', status: 'rendering <Mermaid>' },
];

/** the blocks of `quick-start.mdx`, a file each for a plate each, compiled like the docs */
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
      // keeps a file's authored source, so the editor shows what was compiled
      mdastPlugins: [
        {
          name: 'remark-raw',
          before(_root, ctx) {
            ctx.data.raw = ctx.source.trim();
          },
        } satisfies MdastPluginDefinition,
      ],
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

/** each block's authored source; the frontmatter is parsed apart, so it comes back from its data */
export const blocks: string[] = [];
for (const entry of quickStart.entries) {
  let source = '';
  if (entry.title !== undefined) source += `title: ${entry.title}\n`;
  if (entry.description !== undefined) source += `description: ${entry.description}\n`;
  if (source) source = `---\n${source}---`;
  const raw = entry._exports.raw;
  if (typeof raw === 'string' && raw) source += (source ? '\n\n' : '') + raw;
  blocks.push(source);
}

/** the sources as one file, a blank line between blocks */
export function fileLines(sources: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) out.push('');
    for (const line of sources[i].trimEnd().split('\n')) out.push(line);
  }
  return out;
}
