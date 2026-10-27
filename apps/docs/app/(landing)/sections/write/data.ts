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

/** each block of `quick-start.mdx`: what its tab calls it, the status line while it's pressed */
export const steps = [
  { tab: 'Frontmatter', status: 'rendering <DocsTitle>' },
  { tab: 'Install command', status: 'rendering <CodeBlockTabs>' },
  { tab: 'Type hints', status: 'running Twoslash' },
  { tab: 'Diagram', status: 'rendering <Mermaid>' },
];

/** keeps a file's authored source, so the editor shows what was compiled */
export function remarkRaw(): MdastPluginDefinition {
  return {
    name: 'remark-raw',
    before(_root, ctx) {
      ctx.data.raw = ctx.source.trim();
    },
  };
}

/** a file on the press: its first block is the page's frontmatter */
export const frontmatter = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

/** the blocks of `quick-start.mdx`, a file each for a plate each, compiled like the docs */
export const quickStart = defineCollections({
  type: 'doc',
  dir: 'app/(landing)/sections/write/content',
  compiler: 'satteri',
  schema: frontmatter,
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

/** each block's authored source; the frontmatter is parsed apart, so it comes back from its data */
export function sourcesOf(entries: typeof quickStart.entries): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    let source = '';
    if (entry.title !== undefined) source += `title: ${entry.title}\n`;
    if (entry.description !== undefined) source += `description: ${entry.description}\n`;
    if (source) source = `---\n${source}---`;
    const raw = entry._exports.raw;
    if (typeof raw === 'string' && raw) source += (source ? '\n\n' : '') + raw;
    out.push(source);
  }
  return out;
}

export const blocks = sourcesOf(quickStart.entries);

/** the sources as one file, a blank line between blocks */
export function fileLines(sources: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) out.push('');
    for (const line of sources[i].trimEnd().split('\n')) out.push(line);
  }
  return out;
}
