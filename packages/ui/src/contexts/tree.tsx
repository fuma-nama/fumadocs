'use client';
import type { PageTree } from 'fumadocs-core/server';
import { usePathname } from 'next/navigation';
import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useRef,
} from 'react';
import { searchPath } from 'fumadocs-core/breadcrumb';

interface TreeContextType {
  /**
   * The path to the current node
   */
  path: PageTree.Node[];

  /**
   * Get neighbours of current `pathname`
   */
  getNeighbours: () => [PageTree.Item | undefined, PageTree.Item | undefined];

  root: PageTree.Root | PageTree.Folder;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

function scanNavigationList(
  tree: PageTree.Node[],
  list: PageTree.Item[],
): void {
  tree.forEach((node) => {
    if (node.type === 'folder') {
      if (node.index) {
        list.push(node.index);
      }

      scanNavigationList(node.children, list);
      return;
    }

    if (node.type === 'page' && !node.external) {
      list.push(node);
    }
  });
}

export function TreeContextProvider({
  children,
  tree,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}): ReactNode {
  const pathname = usePathname();
  const cache = useRef<WeakMap<PageTree.Root, PageTree.Item[]>>();

  const value = useMemo<TreeContextType>(() => {
    const path = searchPath(tree.children, pathname) ?? [];
    const root = (path.findLast(
      (item) => item.type === 'folder' && item.root,
    ) ?? tree) as PageTree.Root;

    return {
      path,
      root,
      getNeighbours() {
        cache.current ??= new WeakMap();
        let result = cache.current.get(root);
        if (!result) {
          result = [];
          scanNavigationList(root.children, result);
          cache.current.set(root, result);
        }

        const idx = result.findIndex((item) => item.url === pathname);
        if (idx === -1) return [undefined, undefined];
        return [result[idx - 1], result[idx + 1]];
      },
    };
  }, [pathname, tree]);

  return <TreeContext.Provider value={value}>{children}</TreeContext.Provider>;
}

export function useTreeContext(): TreeContextType {
  const ctx = useContext(TreeContext);

  if (!ctx)
    throw new Error('You must wrap this component under <DocsLayout />');
  return ctx;
}
