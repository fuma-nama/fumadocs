'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  type BaseLayoutProps,
  type BaseSlots,
  type BaseSlotsProps,
  baseSlots,
  getLayoutTabs,
  type GetLayoutTabsOptions,
  type LayoutTab,
  type LinkItemType,
  useLinkItems,
} from '@/layouts/shared';
import { TreeContextProvider } from '@/contexts/tree';
import { createContext, type FC, use, useMemo } from 'react';
import { SidebarProvider } from '@/components/sidebar/base';
import { Sidebar, SidebarDrawer, type SidebarProps } from './slots/sidebar';
import { Header, type HeaderProps } from './slots/header';

export interface GlassSlots extends BaseSlots {
  header: FC<HeaderProps>;
  sidebar: FC<SidebarProps>;
  sidebarDrawer: FC<SidebarProps>;
}

export interface GlassLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  };
  slots?: Partial<GlassSlots>;
}

interface SlotsProps extends BaseSlotsProps<GlassLayoutProps> {
  tabs: LayoutTab[];
  aiChat?: GlassLayoutProps['aiChat'];
}

const LayoutContext = createContext<{
  props: SlotsProps;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: GlassSlots;
} | null>(null);

export function useGlassLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use Glass layout components under <GlassLayout /> (`fumadocs-ui/layouts/glass`).',
    );
  return context;
}

const { useProvider } = baseSlots({
  useProps() {
    return useGlassLayout().props;
  },
});

export function GlassLayout(props: GlassLayoutProps) {
  const { tree, tabs: defaultTabs, aiChat, children, slots: defaultSlots = {} } = props;
  const linkItems = useLinkItems(props);
  const { baseSlots, baseProps } = useProvider(props);

  const tabs = useMemo(() => {
    if (Array.isArray(defaultTabs)) {
      return defaultTabs;
    }
    if (typeof defaultTabs === 'object') {
      return getLayoutTabs(tree, defaultTabs);
    }
    if (defaultTabs !== false) {
      return getLayoutTabs(tree);
    }
    return [];
  }, [tree, defaultTabs]);

  const slots: GlassSlots = {
    ...baseSlots,
    header: defaultSlots.header ?? Header,
    sidebar: defaultSlots.sidebar ?? Sidebar,
    sidebarDrawer: defaultSlots.sidebarDrawer ?? SidebarDrawer,
  };

  return (
    <LayoutContext
      value={{
        props: {
          tabs,
          aiChat,
          ...baseProps,
        },
        slots,
        ...linkItems,
      }}
    >
      <TreeContextProvider tree={tree}>
        <SidebarProvider>
          <div
            id="fd-glass-layout"
            className="grid overflow-x-clip min-h-dvh [--page-col:900px] [--fd-left-width:0px] [--fd-right-width:0px] has-data-[fd-full=true]:[--page-col:1200px] md:[--fd-left-width:280px]"
            style={{
              gridTemplate: `"left left-margin main right-margin right" 1fr / var(--fd-left-width) minmax(0,1fr) minmax(0px, var(--page-col)) minmax(0,1fr) var(--fd-right-width)`,
            }}
          >
            <slots.sidebarDrawer />
            <slots.sidebar />
            <slots.header />
            {children}
          </div>
        </SidebarProvider>
      </TreeContextProvider>
    </LayoutContext>
  );
}
