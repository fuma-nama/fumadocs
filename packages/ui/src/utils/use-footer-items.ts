import { useTreeContext } from '@/contexts/tree';
import type * as PageTree from 'fumadocs-core/page-tree';

const footerCache = new Map<string, PageTree.Item[]>();

/**
 * @returns a list of page tree items (linear), that you can obtain footer items
 */
export function useFooterItems(): PageTree.Item[] {
  const { root } = useTreeContext();
  const cached = footerCache.get(root.$id);
  if (cached) return cached;

  const list: PageTree.Item[] = [];
  function onNode(node: PageTree.Node) {
    if (node.type === 'folder') {
      if (node.index) onNode(node.index);
      for (const child of node.children) onNode(child);
    } else if (node.type === 'page' && !node.external) {
      list.push(node);
    }
  }

  for (const child of root.children) onNode(child);
  footerCache.set(root.$id, list);
  return list;
}
