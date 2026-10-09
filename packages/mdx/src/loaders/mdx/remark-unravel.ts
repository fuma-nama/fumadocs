// from internal remark plugins in https://github.com/mdx-js/mdx/blob/main/packages/mdx/lib/plugin/remark-mark-and-unravel.js
// we need to ensure consistency with MDX.js when parsing embed content in `remark-include`
import type { Transformer } from 'unified';
import type { Nodes, Root, RootContent } from 'mdast';
import { walk } from './mdast-utils';

export function remarkMarkAndUnravel(): Transformer<Root, Root> {
  return (tree) => {
    walk<Nodes>(tree, (node, index, parent) => {
      let offset = -1;
      let all = true;
      let oneOrMore = false;

      if (parent && typeof index === 'number' && node.type === 'paragraph') {
        const children = node.children;

        while (++offset < children.length) {
          const child = children[offset];

          if (child.type === 'mdxJsxTextElement' || child.type === 'mdxTextExpression') {
            oneOrMore = true;
          } else if (child.type === 'text' && child.value.trim().length === 0) {
            // Empty.
          } else {
            all = false;
            break;
          }
        }

        if (all && oneOrMore) {
          offset = -1;
          const newChildren: RootContent[] = [];

          while (++offset < children.length) {
            const child = children[offset];

            if (child.type === 'mdxJsxTextElement') {
              // @ts-expect-error: mutate because it is faster; content model is fine.
              child.type = 'mdxJsxFlowElement';
            }

            if (child.type === 'mdxTextExpression') {
              // @ts-expect-error: mutate because it is faster; content model is fine.
              child.type = 'mdxFlowExpression';
            }

            if (child.type === 'text' && /^[\t\r\n ]+$/.test(String(child.value))) {
              // Empty.
            } else {
              newChildren.push(child);
            }
          }

          parent.children.splice(index, 1, ...newChildren);
          // the new nodes only hold phrasing content, nothing in them to unravel
          return 'skip';
        }
      }
    });
  };
}
