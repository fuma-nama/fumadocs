import { md } from 'fumadocs-core/server';
import { baseUrl } from '@/lib/metadata';
import { plain, type Run } from './content';

/** a page's path as the absolute URL the Markdown links to */
export function url(path: string): string {
  return new URL(path, baseUrl).href;
}

/** a figure's title as its section's heading, the words of its mark first */
export function heading({ lead, title }: { lead?: string; title: readonly Run[] }): string {
  return `## ${lead ? `${lead} ` : ''}${plain(title)}`;
}

/** a section's Markdown, a block of its own however its template is formatted */
export const block = md.indent(0);
