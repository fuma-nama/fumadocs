import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { BlockContent, Root, RootContent } from 'mdast';
import { replace } from '@/utils/mdast-replace';

const Regex = /(?<!\\)\^(?<block_id>\w+)$/m;

export function remarkBlockId(): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, ['text', 'link'], (node, index, parent) => {
      if (node.type === 'link') return 'skip';
      if (node.type !== 'text' || index === undefined || !parent) return;

      const match = Regex.exec(node.value);
      if (!match) return;

      const value =
        node.value.slice(0, match.index) +
        node.value.slice(match.index + match.length);

      replace(parent, {
        type: 'root',
        children: [
          {
            ...parent,
            children: parent.children.slice(0, index),
          } as RootContent,
          {
            type: 'mdxJsxFlowElement',
            name: 'section',
            attributes: [
              {
                type: 'mdxJsxAttribute',
                name: 'id',
                value: match[1],
              },
            ],
            children: [
              {
                type: 'text',
                value,
              } as unknown as BlockContent,
            ],
          },
          {
            ...parent,
            children: parent.children.slice(index + 1),
          } as RootContent,
        ],
      } satisfies Root);
    });
  };
}
