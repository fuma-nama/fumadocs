import type { Heading } from 'mdast';
import { offsets, type Stringifier } from './stringifier';

/** a custom ID at the end of heading text, like `[#id]` */
export const headingIdRegex = /\s*\[#(?<slug>[^]+?)]\s*$/;

/** write the ID of a heading in stringified Markdown, or remove its custom ID */
export function stringifyHeadingId(s: Stringifier, node: Heading, enabled: boolean): void {
  const start = offsets(node)?.start;
  // the content ends with its last child, before the closing sequence or underline
  const last = node.children.at(-1);
  const end = last && offsets(last)?.end;
  if (start === undefined || end === undefined) return;

  const marker = headingIdRegex.exec(s.source.slice(start, end));
  const id = (node.data as { hProperties?: { id?: unknown } } | undefined)?.hProperties?.id;
  if (!enabled && marker) s.edit(start + marker.index, end, '', node);
  else if (enabled && !marker && typeof id === 'string') s.edit(end, end, ` [#${id}]`, node);
}
