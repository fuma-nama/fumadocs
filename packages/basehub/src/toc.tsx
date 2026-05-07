import type { RichTextNode, RichTextTocNode } from 'basehub/api-transaction';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';

export interface ParseTOCOptions {
  node: RichTextTocNode | RichTextTocNode[];
  /** @default 0 */
  initialLevel?: number;

  /** render rich text node */
  render: (node: RichTextNode) => ReactNode;
}

export function parseToc(options: ParseTOCOptions): TOCItemType[] {
  const { node: root, render, initialLevel = 0 } = options;
  const results: TOCItemType[] = [];

  function next(node: RichTextTocNode, level = initialLevel) {
    if (node.type === 'text' || !node.content) return;

    for (const item of node.content) {
      if (item.type === 'orderedList' || item.type === 'listItem') {
        next(item, level + 1);
        continue;
      }

      if (item.type !== 'paragraph' || !item.content || item.content.length === 0) continue;

      for (const text of findTextNode(item.content[0])) {
        const mark = text.marks?.find((m) => m.type === 'link');
        if (!mark) continue;

        results.push({
          depth: level + 1,
          url: mark.attrs.href,
          title: render({
            ...text,
            marks: text.marks?.filter((m) => m.type !== 'link'),
          } as RichTextNode),
        });
      }
    }
  }

  if (Array.isArray(root)) for (const item of root) next(item);
  else next(root);

  return results;
}

function findTextNode(n: RichTextTocNode): Extract<RichTextTocNode, { type: 'text' }>[] {
  if (n.type === 'text') {
    return [n];
  }

  return n.content?.flatMap(findTextNode) ?? [];
}
