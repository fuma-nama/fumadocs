import type * as PageTree from 'fumadocs-core/page-tree';
import { flattenTree } from 'fumadocs-core/page-tree';

/**
 * Get pages in the order they appear in the page tree (navigation order).
 * Uses flattenTree to traverse the tree depth-first, resolving each Item to a page.
 */
export function getPagesInTreeOrder<Page>(
  pageTree: PageTree.Root,
  getNodePage: (node: PageTree.Item) => Page | undefined,
): Page[] {
  const mainItems = flattenTree(pageTree.children);
  const fallbackItems = pageTree.fallback ? flattenTree(pageTree.fallback.children) : [];
  const items = [...mainItems, ...fallbackItems];
  const pages: Page[] = [];

  for (const item of items) {
    const page = getNodePage(item);
    if (page) {
      pages.push(page);
    }
  }

  return pages;
}
