import type * as PageTree from '@/page-tree/definitions';

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
 * Get other page tree nodes that lives under the same parent
 */
export function getPageTreePeers(
  treeOrTrees: PageTree.Root | Record<string, PageTree.Root>,
  url: string,
): PageTree.Item[] {
  // Check if it's a single tree or multiple trees (i18n)
  if ('children' in treeOrTrees) {
    // Single tree case
    const tree = treeOrTrees as PageTree.Root;
    const parent = findParentFromTree(tree, url);
    if (!parent) return [];

    return parent.children.filter(
      (item) => item.type === 'page' && item.url !== url,
    ) as PageTree.Item[];
  }

  // Multiple trees case
  const trees = treeOrTrees as Record<string, PageTree.Root>;

  for (const lang in trees) {
    const rootTree = trees[lang];
    if (rootTree) {
      const parent = findParentFromTree(rootTree, url);
      if (parent) {
        return parent.children.filter(
          (item) => item.type === 'page' && item.url !== url,
        ) as PageTree.Item[];
      }
    }
  }

  return [];
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

/**
 * Search the path of a node in the tree matched by the matcher.
 *
 * @returns The path to the target node (from starting root), or null if the page doesn't exist
 */
export function findPath(
  nodes: PageTree.Node[],
  matcher: (node: PageTree.Node) => boolean,
  options: {
    includeSeparator?: boolean;
  } = {},
): PageTree.Node[] | null {
  const { includeSeparator = true } = options;

  function run(nodes: PageTree.Node[]): PageTree.Node[] | undefined {
    let separator: PageTree.Separator | undefined;

    for (const node of nodes) {
      if (matcher(node)) {
        const items: PageTree.Node[] = [];
        if (separator) items.push(separator);
        items.push(node);

        return items;
      }

      if (node.type === 'separator' && includeSeparator) {
        separator = node;
        continue;
      }

      if (node.type === 'folder') {
        const items =
          node.index && matcher(node.index) ? [node.index] : run(node.children);

        if (items) {
          items.unshift(node);
          if (separator) items.unshift(separator);

          return items;
        }
      }
    }
  }

  return run(nodes) ?? null;
}
