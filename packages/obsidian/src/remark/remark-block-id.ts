import type { Transformer } from 'unified';
import type { Nodes, Root, Text } from 'mdast';
import { replace } from '@/utils/mdast-replace';
import { walk } from '@/utils/mdast-walk';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';

const Regex = /(?<!\\)\^(?<block_id>\w+)$/m;

export function remarkBlockId(): Transformer<Root, Root> {
  return (tree, file) => {
    walk<Nodes>(tree, (node) => {
      if (node.type !== 'paragraph') return;
      let id: string | undefined;

      const textNode = lastText(node);
      const match = textNode ? Regex.exec(textNode.value) : null;
      if (textNode && match) {
        const value = textNode.value;
        id = match[1];
        textNode.value =
          value.slice(0, match.index).trimEnd() + value.slice(match.index + match[0].length);
      }

      if (id) {
        const tag = `^${id}`;
        const paragraph = { ...node };
        replaceSource(file, paragraph, (s) => {
          const markdown = s.stringify(paragraph);
          const index = markdown.lastIndexOf(tag);
          if (index === -1) return markdown;
          return markdown.slice(0, index).trimEnd() + markdown.slice(index + tag.length);
        });

        replace(node, {
          type: 'mdxJsxFlowElement',
          name: 'section',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'id',
              value: tag,
            },
          ],
          children: [paragraph],
        } satisfies MdxJsxFlowElement);
      }

      return 'skip';
    });
  };
}

/** the last text node, outside links and elements */
function lastText(node: Nodes): Text | undefined {
  if (!('children' in node)) return;
  for (let i = node.children.length - 1; i >= 0; i--) {
    const child = node.children[i];
    if (child.type === 'text') return child;
    if (child.type === 'link' || child.type === 'mdxJsxFlowElement') continue;
    const text = lastText(child);
    if (text) return text;
  }
}
