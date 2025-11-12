'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import { usePathname } from 'fumadocs-core/framework';
import { type ReactNode, useMemo, useRef, createContext, use } from 'react';
import { searchPath } from 'fumadocs-core/breadcrumb';

type MakeRequired<O, K extends keyof O> = Omit<O, K> & Pick<Required<O>, K>;

interface TreeContextType {
  root: MakeRequired<PageTree.Root | PageTree.Folder, '$id'>;
  full: PageTree.Root;
}

const TreeContext = createContext<TreeContextType | null>(null);
const PathContext = createContext<PageTree.Node[]>([]);

export function TreeContextProvider(props: {
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const nextIdRef = useRef(0);
  const pathname = usePathname();

  // I found that object-typed props passed from a RSC will be re-constructed, hence breaking all hooks' dependencies
  // using the id here to make sure this never happens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => props.tree, [props.tree.$id ?? props.tree]);
  const path = useMemo(() => {
    return (
      searchPath(tree.children, pathname) ??
      (tree.fallback ? searchPath(tree.fallback.children, pathname) : null) ??
      []
    );
  }, [tree, pathname]);

  const root =
    path.findLast((item) => item.type === 'folder' && item.root) ?? tree;
  root.$id ??= String(nextIdRef.current++);

  return (
    <TreeContext
      value={useMemo(
        () => ({ root, full: tree }) as TreeContextType,
        [root, tree],
      )}
    >
      <PathContext value={path}>{props.children}</PathContext>
    </TreeContext>
  );
}

export function useTreePath(): PageTree.Node[] {
  return use(PathContext);
}

export function useTreeContext(): TreeContextType {
  const ctx = use(TreeContext);

  if (!ctx)
    throw new Error('You must wrap this component under <DocsLayout />');
  return ctx;
}
