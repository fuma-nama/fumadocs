import { useMemo } from 'react';
import type * as PageTree from '@/server/page-tree';

export interface BreadcrumbItem {
  name: string;
  url: string | null;
}

export function useBreadcrumb(
  url: string,
  tree: PageTree.Root,
): BreadcrumbItem[] {
  return useMemo(() => getBreadcrumbItems(url, tree), [tree, url]);
}

export function getBreadcrumbItems(
  url: string,
  tree: PageTree.Root,
): BreadcrumbItem[] {
  return searchPath(tree.children, url) ?? [];
}

/**
 * Search a node in the tree by a specified url
 *
 * - When an index page presents, use it as the item
 * - When the page doesn't exist, return null
 *
 * @returns The path to the target node from root
 */
function searchPath(
  nodes: PageTree.Node[],
  url: string,
): BreadcrumbItem[] | null {
  for (const node of nodes) {
    if (node.type === 'folder') {
      if (node.index && node.index.url === url) {
        return [
          {
            name: node.index.name,
            url: node.index.url,
          },
        ];
      }

      const items = searchPath(node.children, url);

      if (items !== null) {
        items.unshift({
          name: node.name,
          url: node.index?.url ?? null,
        });

        return items;
      }
    }

    if (node.type === 'page' && node.url === url) {
      return [
        {
          name: node.name,
          url: node.url,
        },
      ];
    }
  }

  return null;
}
