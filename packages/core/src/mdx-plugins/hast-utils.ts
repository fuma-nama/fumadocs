import type { Element, Root, RootContent } from 'hast';

/**
 * Visit a node with filtered tag names
 */
export function visit(
  node: RootContent | Root,
  tagNames: string[],
  handler: (node: Element) => void,
): void {
  if (node.type === 'element')
    if (tagNames.includes(node.tagName)) {
      handler(node);
      return;
    }

  if ('children' in node)
    node.children.forEach((n) => {
      visit(n, tagNames, handler);
    });
}
