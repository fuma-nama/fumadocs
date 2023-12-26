import type { FileNode, PageTree, TreeNode } from './types';

/**
 * Flatten tree to an array of page nodes
 */
export function flattenTree(tree: TreeNode[]): FileNode[] {
  return tree.flatMap((node) => {
    if (node.type === 'separator') return [];
    if (node.type === 'folder') {
      const child = flattenTree(node.children);

      if (node.index) return [node.index, ...child];

      return child;
    }

    return [node];
  });
}

/**
 * Get neighbours of a page, useful for implementing "previous & next" buttons
 */
export function findNeighbour(
  tree: PageTree,
  url: string,
): {
  previous?: FileNode;
  next?: FileNode;
} {
  const list = flattenTree(tree.children);

  for (let i = 0; i < list.length; i++) {
    if (list[i].url === url) {
      return {
        next: list[i + 1],
        previous: list[i - 1],
      };
    }
  }

  return {};
}

/**
 * Separate the folder nodes of a root into multiple roots
 */
export function separatePageTree(pageTree: PageTree): PageTree[] {
  return pageTree.children.flatMap<PageTree>((child) => {
    if (child.type !== 'folder') return [];

    return {
      name: child.name,
      url: child.index?.url,
      children: child.children,
    };
  });
}
