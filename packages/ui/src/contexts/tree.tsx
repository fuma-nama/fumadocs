import type { PageTree } from 'fumadocs-core/server';
import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { flattenTree, hasActive } from '@/utils/shared';

interface TreeContextType {
  tree: PageTree.Root;
  list: PageTree.Item[];
  root: PageTree.Root | PageTree.Folder;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

function findRoot(
  items: PageTree.Node[],
  pathname: string,
): PageTree.Folder | undefined {
  for (const item of items) {
    if (item.type === 'folder') {
      const root = findRoot(item.children, pathname);

      if (root) return root;
      if (item.root === true && hasActive(item.children, pathname)) {
        return item;
      }
    }
  }
}

export function TreeContextProvider({
  children,
  tree,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const value = useMemo<TreeContextType>(() => {
    const root = findRoot(tree.children, pathname) ?? tree;
    const list = flattenTree(root.children);

    return {
      root,
      list,
      tree,
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
