import type { RootContent } from 'mdast';

export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map((child) => flattenNode(child)).join('');

  if ('value' in node) return node.value;

  return '';
}

/**
 * Visit a tree in document order, returning `skip` skips the children of a node and `false` stops the walk.
 */
export function walk<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (
    node: N,
    index: number | undefined,
    parent: { children: N[] } | undefined,
  ) => 'skip' | false | void,
  index?: number,
  parent?: { children: N[] },
): boolean {
  const result = visitor(node, index, parent);
  if (result === false) return false;
  if (result !== 'skip' && node.children)
    for (let i = 0; i < node.children.length; i++)
      if (!walk(node.children[i], visitor, i, node as { children: N[] })) return false;
  return true;
}
