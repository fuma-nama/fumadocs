/**
 * Visit a tree in document order, returning `skip` skips the children of a node.
 */
export function walk<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (
    node: N,
    index: number | undefined,
    parent: { children: N[] } | undefined,
  ) => 'skip' | void,
  index?: number,
  parent?: { children: N[] },
): void {
  if (visitor(node, index, parent) === 'skip' || !node.children) return;
  for (let i = 0; i < node.children.length; i++)
    walk(node.children[i], visitor, i, node as { children: N[] });
}
