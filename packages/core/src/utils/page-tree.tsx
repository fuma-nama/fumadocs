import type * as PageTree from '@/source/page-tree/definitions';

/**
 * Flatten tree to an array of page nodes
 */
export function flattenTree(nodes: PageTree.Node[]): PageTree.Item[] {
  const out: PageTree.Item[] = [];

  for (const node of nodes) {
    if (node.type === 'folder') {
      if (node.index) out.push(node.index);
      out.push(...flattenTree(node.children));
    } else if (node.type === 'page') {
      out.push(node);
    }
  }

  return out;
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
  if (tree.fallback) roots.push(tree.fallback);

  for (const root of roots) {
    const list = flattenTree(root.children);
    const idx = list.findIndex((item) => item.url === url);
    if (idx === -1) continue;

    return {
      previous: list[idx - 1],
      next: list[idx + 1],
    };
  }

  return {};
}

export function getPageTreeRoots(
  pageTree: PageTree.Root | PageTree.Folder,
): (PageTree.Root | PageTree.Folder)[] {
  const result = pageTree.children.flatMap((child) => {
    if (child.type !== 'folder') return [];
    const roots = getPageTreeRoots(child);

    if (child.root) roots.push(child);
    return roots;
  });

  if (!('type' in pageTree)) result.push(pageTree);
  return result;
}

/**
 * Separate the folder nodes of a root into multiple roots
 *
 * @deprecated it's useless
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

/**
 * Get other page tree nodes that lives under the same parent
 */
export function getPageTreePeers(
  tree: PageTree.Root,
  url: string,
): PageTree.Item[] {
  const parent = findParentFromTree(tree, url);
  if (!parent) return [];

  return parent.children.filter(
    (item) => item.type === 'page' && item.url !== url,
  ) as PageTree.Item[];
}

function findParentFromTree(
  node: PageTree.Root | PageTree.Folder,
  url: string,
): PageTree.Root | PageTree.Folder | undefined {
  if ('index' in node && node.index?.url === url) {
    return node;
  }

  for (const child of node.children) {
    if (child.type === 'folder') {
      const parent = findParentFromTree(child, url);
      if (parent) return parent;
    }

    if (child.type === 'page' && child.url === url) {
      return node;
    }
  }

  if ('fallback' in node && node.fallback) {
    return findParentFromTree(node.fallback, url);
  }
}
