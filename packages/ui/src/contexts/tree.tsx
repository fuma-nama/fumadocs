'use client';
import type { PageTree } from 'fumadocs-core/server';
import { usePathname } from 'fumadocs-core/framework';
import {
  createContext,
  useContext,
  type ReactNode,
  useMemo,
  useRef,
} from 'react';
import { searchPath } from 'fumadocs-core/breadcrumb';

type MakeRequired<O, K extends keyof O> = Omit<O, K> & Pick<Required<O>, K>;

interface TreeContextType {
  root: MakeRequired<PageTree.Root | PageTree.Folder, '$id'>;
}

const TreeContext = createContext<TreeContextType | null>(null);
const PathContext = createContext<PageTree.Node[]>([]);

export function TreeContextProvider({
  children,
  tree,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const nextIdRef = useRef(0);
  const pathname = usePathname();
  const path = useMemo(
    () => searchPath(tree.children, pathname) ?? [],
    [pathname, tree],
  );

  const root =
    path.findLast((item) => item.type === 'folder' && item.root) ?? tree;
  root.$id ??= String(nextIdRef.current++);

  return (
    <TreeContext.Provider
      value={useMemo(() => ({ root: root as TreeContextType['root'] }), [root])}
    >
      <PathContext.Provider value={path}>{children}</PathContext.Provider>
    </TreeContext.Provider>
  );
}

export function useTreePath(): PageTree.Node[] {
  return useContext(PathContext);
}

export function useTreeContext(): TreeContextType {
  const ctx = useContext(TreeContext);

  if (!ctx)
    throw new Error('You must wrap this component under <DocsLayout />');
  return ctx;
}
