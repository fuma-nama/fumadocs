import type * as PageTree from './page-tree';

/**
 * Flatten tree to an array of page nodes
 */
export function flattenTree(tree: PageTree.Node[]): PageTree.Item[] {
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
  tree: PageTree.Root,
  url: string,
  options?: {
    separateRoot?: boolean;
  },
): {
  previous?: PageTree.Item;
  next?: PageTree.Item;
} {
  const { separateRoot = true } = options ?? {};
  const roots = separateRoot ? getPageTreeRoots(tree) : [tree];
  const lists = roots.map((node) => flattenTree(node.children));

  for (const list of lists) {
    for (let i = 0; i < list.length; i++) {
      if (list[i].url === url) {
        return {
          next: list[i + 1],
          previous: list[i - 1],
        };
      }
    }
  }

  return {};
}

export function getPageTreeRoots(
  pageTree: PageTree.Root | PageTree.Folder,
): (PageTree.Root | PageTree.Folder)[] {
  const result = pageTree.children.flatMap((child) => {
    if (child.type !== 'folder') return [];
    const roots = getPageTreeRoots(child);

    if (child.root) {
      roots.push(child);
    }

    return roots;
  });

  if (!('type' in pageTree)) result.push(pageTree);
  return result;
}

/**
 * Separate the folder nodes of a root into multiple roots
 */
export function separatePageTree(pageTree: PageTree.Root): PageTree.Root[] {
  return pageTree.children.flatMap((child) => {
    if (child.type !== 'folder') return [];

    return {
      name: child.name,
      url: child.index?.url,
      children: child.children,
    };
  });
}
