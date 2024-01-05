import type { Element, Parent, Root, RootContent } from 'hast';

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

export function flattenNode(node: RootContent): string {
  if ('children' in node) {
    return all(node);
  }

  if ('value' in node) {
    return node.value;
  }

  return '';
}

function one(node: RootContent): string {
  if (node.type === 'text') {
    return node.value;
  }

  return 'children' in node ? all(node) : '';
}

function all(node: Parent): string {
  const result: string[] = [];

  for (let i = 0; i < node.children.length; i++) {
    result[i] = one(node.children[i]);
  }

  return result.join('');
}
