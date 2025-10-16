import { type ReactNode, useMemo } from 'react';
import type * as PageTree from '@/page-tree/definitions';
import { normalizeUrl } from '@/utils/normalize-url';
import { findPath } from '@/page-tree/utils';

export interface BreadcrumbItem {
  name: ReactNode;
  url?: string;
}

export interface BreadcrumbOptions {
  /**
   * Include the root folders in the breadcrumb items array.
   *
   * @defaultValue false
   */
  includeRoot?:
    | boolean
    | {
        /**
         * Specify the url of root
         */
        url: string;
      };

  /**
   * Include the page itself in the breadcrumb items array
   *
   * @defaultValue false
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
  options?: BreadcrumbOptions,
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
  return getBreadcrumbItemsFromPath(
    tree,
    searchPath(tree.children, url) ?? [],
    options,
  );
}

export function getBreadcrumbItemsFromPath(
  tree: PageTree.Root,
  path: PageTree.Node[],
  options: BreadcrumbOptions,
): BreadcrumbItem[] {
  const {
    includePage = false,
    includeSeparator = false,
    includeRoot = false,
  } = options;
  let items: BreadcrumbItem[] = [];
  for (let i = 0; i < path.length; i++) {
    const item = path[i];

    switch (item.type) {
      case 'page':
        if (includePage)
          items.push({
            name: item.name,
            url: item.url,
          });
        break;
      case 'folder':
        if (item.root && !includeRoot) {
          items = [];
          break;
        }

        // only show the index node of folders if possible
        if (i === path.length - 1 || item.index !== path[i + 1]) {
          items.push({
            name: item.name,
            url: item.index?.url,
          });
        }
        break;
      case 'separator':
        if (item.name && includeSeparator)
          items.push({
            name: item.name,
          });
        break;
    }
  }

  if (includeRoot) {
    items.unshift({
      name: tree.name,
      url: typeof includeRoot === 'object' ? includeRoot.url : undefined,
    });
  }

  return items;
}

/**
 * Search the path of a node in the tree by a specified url
 *
 * - When the page doesn't exist, return null
 *
 * @returns The path to the target node from root
 * @internal Don't use this on your own
 */
export function searchPath(
  nodes: PageTree.Node[],
  url: string,
): PageTree.Node[] | null {
  const normalizedUrl = normalizeUrl(url);

  return findPath(
    nodes,
    (node) => node.type === 'page' && node.url === normalizedUrl,
  );
}
