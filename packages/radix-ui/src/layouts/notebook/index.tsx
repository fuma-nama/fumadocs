import type * as PageTree from 'fumadocs-core/page-tree';
import { type HTMLAttributes, useMemo } from 'react';
import type { SidebarProps, SidebarProviderProps } from './slots/sidebar';
import {
  type GetLayoutTabsOptions,
  type LayoutTab,
  type NavOptions,
  type BaseLayoutProps,
  getLayoutTabs,
} from '@/layouts/shared';
import { type DocsSlots, LayoutBody } from './client';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  tabMode?: 'sidebar' | 'navbar';
  sidebar?: SidebarOptions;
  nav?: Nav;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  slots?: Partial<DocsSlots>;
}

interface Nav extends NavOptions {
  mode?: 'top' | 'auto';
}

interface SidebarOptions extends SidebarProps, SidebarProviderProps {
  /**
   * @deprecated use layout-level `tabs` option instead.
   */
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
}

export function DocsLayout({
  tree,
  tabMode = 'sidebar',
  sidebar: { tabs: defaultTabs, ...sidebarProps } = {},
  children,
  tabs = defaultTabs,
  ...props
}: DocsLayoutProps) {
  const resolvedTabs = useMemo(() => {
    if (Array.isArray(tabs)) {
      return tabs;
    }
    if (typeof tabs === 'object') {
      return getLayoutTabs(tree, tabs);
    }
    if (tabs !== false) {
      return getLayoutTabs(tree);
    }
    return [];
  }, [tabs, tree]);

  return (
    <LayoutBody tree={tree} tabs={resolvedTabs} tabMode={tabMode} sidebar={sidebarProps} {...props}>
      {children}
    </LayoutBody>
  );
}

export { useNotebookLayout, type DocsSlots } from './client';
