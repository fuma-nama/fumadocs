import type * as PageTree from 'fumadocs-core/page-tree';
import { type HTMLAttributes, type ReactNode, useMemo } from 'react';
import type { SidebarProps, SidebarProviderProps } from './slots/sidebar';
import {
  getLayoutTabs,
  type BaseLayoutProps,
  type GetLayoutTabsOptions,
  type LayoutTab,
} from '@/layouts/shared';
import { sanitizeTreeForClient } from '@/utils/sanitize-tree';
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
  // Strip fields that only the loader needs (`$ref`, non-root `$id`s, unset optional fields)
  // before the tree crosses into client-rendered flight data (see fuma-nama/fumadocs#3578).
  // Tabs are derived from this same sanitized tree so `$folder` references stay consistent
  // with the tree passed to `LayoutBody`.
  const clientTree = sanitizeTreeForClient(tree);

  const tabs = useMemo(() => {
    if (Array.isArray(layoutTabs)) {
      return layoutTabs;
    }
    if (typeof layoutTabs === 'object') {
      return getLayoutTabs(clientTree, layoutTabs);
    }
    if (layoutTabs !== false) {
      return getLayoutTabs(clientTree);
    }
    return [];
  }, [clientTree, layoutTabs]);

  return (
    <LayoutBody tree={clientTree} tabs={tabs} tabMode={tabMode} sidebar={sidebarProps} {...props}>
      {children}
    </LayoutBody>
  );
}

export { type DocsSlots, useDocsLayout } from './client';
