import { defineHastPlugin } from 'satteri';
import type { Element } from 'hast';

// Satteri's mdast→hast conversion inserts `"\n"` text nodes between block
// children for readability. That is harmless in most elements, but inside
// `table`/`thead`/`tbody`/`tr` the browser's HTML parser relocates stray text
// out of the table, so React reports a hydration mismatch
// ("whitespace text nodes cannot be a child of <tbody>"). Strip whitespace-only
// text directly inside those structural elements.
const TABLE_STRUCTURE = ['table', 'thead', 'tbody', 'tfoot', 'tr'];

function isWhitespaceText(node: { type: string; value?: string }) {
  return node.type === 'text' && (node.value ?? '').trim().length === 0;
}

export function rehypeTable() {
  return defineHastPlugin({
    name: 'rehype-table',
    element: {
      filter: TABLE_STRUCTURE,
      visit(node, ctx) {
        const element = node as Element;
        // remove from the end so earlier indices stay valid as patches queue
        for (let i = element.children.length - 1; i >= 0; i--) {
          if (isWhitespaceText(element.children[i]!)) {
            ctx.removeChildAt(element, i);
          }
        }
      },
    },
  });
}
