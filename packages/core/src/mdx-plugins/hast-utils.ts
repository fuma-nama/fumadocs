import type { Element, Root, RootContent } from 'hast';

/**
 * Visit a node with filtered tag names
 */
export function visit(
  node: RootContent | Root,
  tagNames: string[],
  handler: (node: Element) => 'skip' | undefined,
): void {
  if (node.type === 'element' && tagNames.includes(node.tagName)) {
    const result = handler(node);
    if (result === 'skip') return;
  }

  if ('children' in node)
    node.children.forEach((n) => {
      visit(n, tagNames, handler);
    });
}
