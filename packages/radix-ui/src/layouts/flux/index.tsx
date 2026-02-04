import type * as PageTree from 'fumadocs-core/page-tree';
import { type ComponentProps, type HTMLAttributes, type ReactNode, useMemo } from 'react';
import type { Sidebar } from './sidebar';
import type { BaseLayoutProps } from '@/layouts/shared';
import { LayoutContent, LayoutContextProvider } from './client';
import { TreeContextProvider } from '@/contexts/tree';
import { getSidebarTabs, type GetSidebarTabsOptions } from '@/components/sidebar/tabs';
import type { SidebarPageTreeComponents } from '@/components/sidebar/page-tree';
import { type SidebarTabWithProps } from '@/components/sidebar/tabs/dropdown';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: SidebarOptions;

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

interface SidebarOptions
  extends
    ComponentProps<'aside'>,
    Pick<ComponentProps<typeof Sidebar>, 'defaultOpenLevel' | 'prefetch'> {
  enabled?: boolean;
  component?: ReactNode;
  components?: Partial<SidebarPageTreeComponents>;

  /**
   * Root Toggle options
   */
  tabs?: SidebarTabWithProps[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;
}

export function DocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: { tabs: sidebarTabs, ...sidebarProps } = {},
  tree,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(() => {
    if (Array.isArray(sidebarTabs)) {
      return sidebarTabs;
    }
    if (typeof sidebarTabs === 'object') {
      return getSidebarTabs(tree, sidebarTabs);
    }
    if (sidebarTabs !== false) {
      return getSidebarTabs(tree);
    }
    return [];
  }, [tree, sidebarTabs]);

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContextProvider navTransparentMode={transparentMode}>
        <LayoutContent nav={nav} sidebar={sidebarProps} tabs={tabs} {...props} />
      </LayoutContextProvider>
    </TreeContextProvider>
  );
}
