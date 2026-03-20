import type * as PageTree from 'fumadocs-core/page-tree';
import { type HTMLAttributes, type ReactNode, useMemo } from 'react';
import type { SidebarProps, SidebarProviderProps } from './slots/sidebar';
import {
  getLayoutTabs,
  type BaseLayoutProps,
  type GetLayoutTabsOptions,
  type LayoutTab,
} from '@/layouts/shared';
import { type DocsSlots, LayoutBody } from './client';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  sidebar?: SidebarOptions;
  tabMode?: 'top' | 'auto';
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  containerProps?: HTMLAttributes<HTMLDivElement>;
  slots?: Partial<DocsSlots>;
}

interface SidebarOptions extends SidebarProps, SidebarProviderProps {
  enabled?: boolean;
  /**
   * @deprecated use `slots.sidebar` instead.
   */
  component?: ReactNode;
  /**
   * @deprecated use layout-level `tabMode` option instead.
   */
  tabMode?: 'auto' | 'top';
  /**
   * @deprecated use layout-level `tabs` option instead.
   */
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
}

export function DocsLayout({
  tree,
  sidebar: { tabs: _tabs, tabMode: _tabMode, ...sidebarProps } = {},
  tabs: layoutTabs = _tabs,
  tabMode = _tabMode,
  children,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(() => {
    if (Array.isArray(layoutTabs)) {
      return layoutTabs;
    }
    if (typeof layoutTabs === 'object') {
      return getLayoutTabs(tree, layoutTabs);
    }
    if (layoutTabs !== false) {
      return getLayoutTabs(tree);
    }
    return [];
  }, [tree, layoutTabs]);

  return (
    <LayoutBody tree={tree} tabs={tabs} tabMode={tabMode} sidebar={sidebarProps} {...props}>
      {children}
    </LayoutBody>
  );
}

export { type DocsSlots, useDocsLayout } from './client';
