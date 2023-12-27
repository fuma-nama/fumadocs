import type { PageTree } from 'next-docs-zeta/server';
import { usePathname } from 'next/navigation';
import { createContext, useContext, type ReactNode, useMemo } from 'react';
import { hasActive } from '@/utils/shared';

export interface LinkItem {
  url: string;
  icon?: ReactNode;
  text: string;
  external?: boolean;
}

interface TreeContextType {
  root: PageTree.Root;
  active: PageTree.Root | PageTree.Folder;
}

const TreeContext = createContext<TreeContextType | undefined>(undefined);

export function TreeContextProvider({
  children,
  tree,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}): JSX.Element {
  const pathname = usePathname();
  const value: TreeContextType = useMemo(() => {
    const folder = tree.children.find(
      (child) =>
        child.type === 'folder' &&
        child.root === true &&
        hasActive(child.children, pathname),
    );

    return {
      active: folder?.type === 'folder' ? folder : tree,
      root: tree,
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
