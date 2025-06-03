import { type ReactNode, useMemo } from 'react';
import type * as PageTree from '@/server/page-tree';

export interface BreadcrumbItem {
  name: ReactNode;
  url?: string;
}

export interface BreadcrumbOptions {
  /**
   * Include the root itself in the breadcrumb items array.
   * Specify the url by passing an object instead
   *
   * @defaultValue false
   */
  includeRoot?:
    | boolean
    | {
        url: string;
      };

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
  const { includePage = true, includeSeparator = false, includeRoot } = options;
  let items: BreadcrumbItem[] = [];

  path.forEach((item, i) => {
    if (item.type === 'separator' && item.name && includeSeparator) {
      items.push({
        name: item.name,
      });
    }

    if (item.type === 'folder') {
      const next = path.at(i + 1);
      if (next && item.index === next) return;

      if (item.root) {
        items = [];
        return;
      }

      items.push({
        name: item.name,
        url: item.index?.url,
      });
    }

    if (item.type === 'page' && includePage) {
      items.push({
        name: item.name,
        url: item.url,
      });
    }
  });

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
 * @internal
 */
export function searchPath(
  nodes: PageTree.Node[],
  url: string,
): PageTree.Node[] | null {
  if (url.endsWith('/')) url = url.slice(0, -1);
  url = decodeURIComponent(url);
  let separator: PageTree.Separator | undefined;

  for (const node of nodes) {
    if (node.type === 'separator') separator = node;

    if (node.type === 'folder') {
      if (node.index?.url === url) {
        const items: PageTree.Node[] = [];

        if (separator) items.push(separator);
        items.push(node, node.index);

        return items;
      }

      const items = searchPath(node.children, url);

      if (items) {
        items.unshift(node);
        if (separator) items.unshift(separator);

        return items;
      }
    }

    if (node.type === 'page' && node.url === url) {
      const items: PageTree.Node[] = [];

      if (separator) items.push(separator);
      items.push(node);

      return items;
    }
  }

  return null;
}
