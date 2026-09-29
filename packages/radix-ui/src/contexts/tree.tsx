'use client';
import * as PageTree from 'fumadocs-core/page-tree';
import { usePathname } from 'fumadocs-core/framework';
import { type ReactNode, useMemo, useRef, createContext, use } from 'react';
import { searchPath } from 'fumadocs-core/breadcrumb';
import type { LayoutTab } from '@/layouts/shared';

type MakeRequired<O, K extends keyof O> = Omit<O, K> & Pick<Required<O>, K>;

interface TreeContextType {
  root: MakeRequired<PageTree.Root | PageTree.Folder, '$id'>;
  full: PageTree.Root;
}

const TreeContext = createContext<TreeContextType | null>(null);
const PathContext = createContext<PageTree.Node[]>([]);

export function TreeContextProvider({
  tree: rawTree,
  children,
}: {
  tree: PageTree.Root;
  children: ReactNode;
}) {
  const nextIdRef = useRef(0);
  const pathname = usePathname();

  // I found that object-typed props passed from a RSC will be re-constructed, hence breaking all hooks' dependencies
  // using the id here to make sure this never happens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => rawTree, [rawTree.$id]);
  const path = useMemo(() => {
    return (
      searchPath(tree.children, pathname) ??
      (tree.fallback ? searchPath(tree.fallback.children, pathname) : null) ??
      []
    );
  }, [tree, pathname]);

  const root = path.findLast((item) => item.type === 'folder' && item.root) ?? tree;
  root.$id ??= String(nextIdRef.current++);

  return (
    <TreeContext value={useMemo(() => ({ root, full: tree }) as TreeContextType, [root, tree])}>
      <PathContext value={path}>{children}</PathContext>
    </TreeContext>
  );
}

export function useTreePath(): PageTree.Node[] {
  return use(PathContext);
}

export function useTreeContext(): TreeContextType {
  const ctx = use(TreeContext);

  if (!ctx) throw new Error('You must wrap this component under <DocsLayout />');
  return ctx;
}

export interface TabsGroup {
  /** the root folder on the current page's path, undefined for tabs not bound to the page tree */
  active?: PageTree.Folder;
  options: LayoutTab[];
}

/**
 * Group tabs by the root folders on the current page's path (outermost first): each tab is
 * matched to its root folder, linking to the projection of current page when possible.
 *
 * Tabs not bound to the page tree are appended to the group of `root: true` folders.
 */
export function useTabsGroups(tabs: LayoutTab[]): TabsGroup[] {
  const { full: tree } = useTreeContext();
  const path = use(PathContext);

  return useMemo(() => {
    const out: TabsGroup[] = [];
    const last = path[path.length - 1];
    const page = last?.type === 'page' ? last : undefined;
    let scope: PageTree.Root | PageTree.Folder =
      tree.fallback && !tree.children.includes(path[0]) ? tree.fallback : tree;

    for (const node of path) {
      if (node.type !== 'folder' || !node.root) continue;
      const group: TabsGroup = { active: node, options: [] };
      collectTabs(scope, node, page, tabs, group.options);
      if (group.options.length > 0) out.push(group);
      scope = node;
    }

    const custom = tabs.filter((tab) => !tab.$folder);
    if (custom.length > 0) {
      const group = out.findLast((group) => group.active?.root === true);
      if (group) group.options.push(...custom);
      else out.push({ options: custom });
    }

    return out;
  }, [tabs, tree, path]);
}

/** collect the tabs of root folders with the same type as `active` within a scope */
function collectTabs(
  scope: PageTree.Root | PageTree.Folder,
  active: PageTree.Folder,
  page: PageTree.Item | undefined,
  tabs: LayoutTab[],
  out: LayoutTab[],
) {
  for (const node of scope.children) {
    if (node.type !== 'folder') continue;
    if (node.root === active.root) {
      const tab = tabs.find(
        (tab) => tab.$folder && (tab.$folder === node || tab.$folder.$id === node.$id),
      );
      if (!tab) continue;

      const projection = page && PageTree.findProjection(active, node, page);
      out.push(projection ? { ...tab, url: projection.url } : tab);
    } else if (!node.root) {
      // any other root folder starts a new scope
      collectTabs(node, active, page, tabs, out);
    }
  }
}
