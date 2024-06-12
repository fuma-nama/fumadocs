import { useMemo } from 'react';
import type * as PageTree from '@/server/page-tree';

export interface BreadcrumbItem {
  name: string;
  url?: string;
}

export interface BreadcrumbOptions {
  /**
   * Include the page itself in the breadcrumb items array
   *
   * @defaultValue true
   */
  includePage?: boolean;

  /**
   * Count separator as an item
   *
   * @defaultValue false
   */
  includeSeparator?: boolean;
}

export function useBreadcrumb(
  url: string,
  tree: PageTree.Root,
  options: BreadcrumbOptions = {},
): BreadcrumbItem[] {
  return useMemo(
    () => getBreadcrumbItems(url, tree, options),
    [tree, url, options],
  );
}

export function getBreadcrumbItems(
  url: string,
  tree: PageTree.Root,
  options: BreadcrumbOptions = {},
): BreadcrumbItem[] {
  return (
    searchPath(tree.children, url, {
      includePage: options.includePage ?? true,
      includeSeparator: options.includeSeparator ?? false,
    }) ?? []
  );
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
  options: Required<BreadcrumbOptions>,
): BreadcrumbItem[] | null {
  let separator: string | undefined;

  for (const node of nodes) {
    if (options.includeSeparator && node.type === 'separator')
      separator = node.name;

    if (node.type === 'folder') {
      if (node.index?.url === url) {
        const items: BreadcrumbItem[] = [];

        if (separator) items.push({ name: separator });
        if (options.includePage)
          items.push({
            name: node.index.name,
            url: node.index.url,
          });

        return items;
      }

      const items = searchPath(node.children, url, options);

      if (items) {
        items.unshift({
          name: node.name,
          url: node.index?.url,
        });
        if (separator) items.unshift({ name: separator });

        return items;
      }
    }

    if (node.type === 'page' && node.url === url) {
      const items: BreadcrumbItem[] = [];

      if (separator) items.push({ name: separator });
      if (options.includePage)
        items.push({
          name: node.name,
          url: node.url,
        });

      return items;
    }
  }

  return null;
}
