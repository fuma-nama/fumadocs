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
 * Split path into segments, trailing/leading slashes are removed
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => p.length > 0);
}

/**
 * Convert paths to an array, slashes within the path will be ignored
 * @param paths - Paths to join
 * @param slash - whether to add a trailing/leading slash to path
 * @example
 * ```
 * ['a','b','c'] // 'a/b/c'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', 'b/c'] // 'a/b/c'
 * ```
 */
export function joinPaths(
  paths: string[],
  slash: 'leading' | 'trailing' | 'none' = 'none',
): string {
  const joined = paths
    // avoid slashes in path and filter empty
    .flatMap((path) => splitPath(path))
    .join('/');

  switch (slash) {
    case 'leading':
      return `/${joined}`;
    case 'trailing':
      return `${joined}/`;
    default:
      return joined;
  }
}

export function createGetUrl(
  baseUrl: string,
): (slugs: string[], locale?: string) => string {
  return (slugs, locale) => {
    const paths = [baseUrl, ...slugs];
    if (locale) paths.push(locale);

    return joinPaths(paths, 'leading');
  };
}
