import { quickStart } from './quick-start';

/** the authored source of each block of `quick-start.mdx`, as Fumadocs MDX compiled it */
export const blocks: string[] = [];
for (const entry of quickStart.entries) {
  // the frontmatter is parsed apart from the body, it comes back from its data
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
