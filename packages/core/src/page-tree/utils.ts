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
 * Get other item nodes that lives under the same parent.
 */
export function getPageTreePeers(
  treeOrTrees: PageTree.Root | Record<string, PageTree.Root>,
  url: string,
): PageTree.Item[] {
  return findSiblings(treeOrTrees, url).filter((item) => item.type === 'page');
}

/**
 * Get other tree nodes that lives under the same parent.
 */
export function findSiblings(
  treeOrTrees: PageTree.Root | Record<string, PageTree.Root>,
  url: string,
): PageTree.Node[] {
  // Check if it's a single tree or multiple trees (i18n)
  if ('children' in treeOrTrees) {
    // Single tree case
    const tree = treeOrTrees as PageTree.Root;
    const parent = findParent(tree, url);
    if (!parent) return [];

    return parent.children.filter((item) => item.type !== 'page' || item.url !== url);
  }

  // Multiple trees case
  for (const lang in treeOrTrees) {
    const result = getPageTreePeers(treeOrTrees[lang], url);
    if (result) return result;
  }

  return [];
}

export function findParent(
  from: PageTree.Root | PageTree.Folder,
  url: string,
): PageTree.Root | PageTree.Folder | undefined {
  let result: PageTree.Root | PageTree.Folder | undefined;

  visit(from, (node, parent) => {
    if ('type' in node && node.type === 'page' && node.url === url) {
      result = parent;
      return 'break';
    }
  });

  return result;
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
        const items = node.index && matcher(node.index) ? [node.index] : run(node.children);

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

const VisitBreak = Symbol('VisitBreak');

/**
 * Perform a depth-first search on page tree visiting every node.
 *
 * @param root - the root of page tree to visit.
 * @param visitor - function to receive nodes, return `skip` to skip the children of current node, `break` to stop the search entirely.
 */
export function visit<Root extends PageTree.Node | PageTree.Root>(
  root: Root,
  visitor: <T extends PageTree.Node | PageTree.Root>(
    node: T,
    parent?: PageTree.Root | PageTree.Folder,
  ) => 'skip' | 'break' | T | void,
): Root {
  function onNode<T extends PageTree.Node | PageTree.Root>(
    node: T,
    parent?: PageTree.Root | PageTree.Folder,
  ): T {
    const result = visitor(node, parent);
    switch (result) {
      case 'skip':
        return node;
      case 'break':
        throw VisitBreak;
      default:
        if (result) node = result;
    }

    if ('index' in node && node.index) {
      node.index = onNode(node.index, node);
    }

    if ('fallback' in node && node.fallback) {
      node.fallback = onNode(node.fallback, node);
    }

    if ('children' in node) {
      for (let i = 0; i < node.children.length; i++) {
        node.children[i] = onNode(node.children[i], node);
      }
    }

    return node;
  }

  try {
    return onNode(root);
  } catch (e) {
    if (e === VisitBreak) return root;
    throw e;
  }
}
