import type { PageTree } from '@maximai/fumadocs-core/server';
import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { hasActive } from '@/utils/shared';

interface TreeContextType {
  tree: PageTree.Root;
  navigation: PageTree.Item[];
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

function getNavigationList(tree: PageTree.Node[]): PageTree.Item[] {
  return tree.flatMap((node) => {
    if (node.type === 'separator') return [];
    if (node.type === 'folder') {
      const children = getNavigationList(node.children);

      if (!node.root && node.index) children.unshift(node.index);
      return children;
    }

    // Only non-external links will be shown in the navigation list
    return !node.external ? [node] : [];
  });
}

export function TreeContextProvider({
  children,
  tree,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}): React.ReactElement {
  const pathname = usePathname();
  const value = useMemo<TreeContextType>(() => {
    const root = findRoot(tree.children, pathname) ?? tree;

    return {
      root,
      navigation: getNavigationList(root.children),
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
