'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type ComponentProps, createContext, type FC, use, useMemo } from 'react';
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
import {
  Sidebar,
  SidebarDrawer,
  SidebarProvider,
  type SidebarProps,
  type SidebarProviderProps,
} from './slots/sidebar';
import { Header } from './slots/header';

export interface SpaciousSlots extends BaseSlots {
  header: FC<ComponentProps<'header'>>;
  sidebar: {
    provider: FC<SidebarProviderProps>;
    main: FC<SidebarProps>;
    drawer: FC;
  };
}

export interface SpaciousLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
  };
  sidebar?: Omit<SidebarProviderProps, 'children'>;
  slots?: Partial<SpaciousSlots>;
}

interface SlotsProps extends BaseSlotsProps<SpaciousLayoutProps> {
  tabs: LayoutTab[];
  aiChat?: SpaciousLayoutProps['aiChat'];
}

const LayoutContext = createContext<{
  props: SlotsProps;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: SpaciousSlots;
} | null>(null);

export function useSpaciousLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use Spacious layout components under <SpaciousLayout /> (`fumadocs-ui/layouts/spacious`).',
    );
  return context;
}

const { useBaseSlots } = baseSlots({
  useProps() {
    return useSpaciousLayout().props;
  },
});

export function SpaciousLayout(props: SpaciousLayoutProps) {
  const { tree, tabs: tabsOptions, aiChat, sidebar, slots: customSlots = {}, children } = props;
  const linkItems = useLinkItems(props);
  const { baseSlots, baseProps } = useBaseSlots(props);
  const tabs = useMemo(() => {
    if (Array.isArray(tabsOptions)) return tabsOptions;
    if (tabsOptions === false) return [];
    return getLayoutTabs(tree, { transform: (option) => option, ...tabsOptions });
  }, [tree, tabsOptions]);

  const slots: SpaciousSlots = {
    ...baseSlots,
    header: customSlots.header ?? Header,
    sidebar: customSlots.sidebar ?? {
      provider: SidebarProvider,
      main: Sidebar,
      drawer: SidebarDrawer,
    },
  };

  return (
    <LayoutContext value={{ props: { tabs, aiChat, ...baseProps }, slots, ...linkItems }}>
      <TreeContextProvider tree={tree}>
        <slots.sidebar.provider {...sidebar}>
          <div
            id="fd-spacious-layout"
            className="relative grid min-h-(--fd-layout-height) transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none [--fd-layout-height:calc(100dvh-var(--fd-banner-height,0px))] [--fd-sidebar-width:0px] [--fd-right-width:0px] md:h-(--fd-layout-height) md:overflow-hidden md:bg-fd-card print:h-auto print:overflow-visible"
            style={{
              gridTemplate: `"sidebar header right" auto
"sidebar main right" 1fr / var(--fd-sidebar-width) minmax(0, 1fr) var(--fd-right-width)`,
            }}
          >
            <slots.sidebar.main />
            <slots.header />
            {children}
            <slots.sidebar.drawer />
          </div>
        </slots.sidebar.provider>
      </TreeContextProvider>
    </LayoutContext>
  );
}
