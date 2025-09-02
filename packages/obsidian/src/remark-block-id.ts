import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'mdast';
import { replace } from '@/utils/mdast-replace';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

const Regex = /(?<!\\)\^(?<block_id>\w+)$/m;

export function remarkBlockId(): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      let id: string | undefined;

      visit(
        node,
        ['link', 'text', 'mdxJsxFlowElement'],
        (textNode) => {
          if (textNode.type !== 'text') return 'skip';

          const value = textNode.value;
          const match = Regex.exec(value);
          // if last text node isn't a block id, skip
          if (!match) return false;

          id = match[1];
          textNode.value =
            value.slice(0, match.index).trimEnd() +
            value.slice(match.index + match[0].length);
          return false;
        },
        true,
      );

      if (id) {
        replace(node, {
          type: 'mdxJsxFlowElement',
          name: 'section',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'id',
              value: `^${id}`,
            },
          ],
          children: [
            {
              ...node,
            },
          ],
        } satisfies MdxJsxFlowElement);
      }

      return 'skip';
    });
  };
}
