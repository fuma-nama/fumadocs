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
import {
  drawerHandle,
  Sidebar,
  SidebarDrawer,
  SidebarProvider,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
  type SidebarDrawerProps,
} from './slots/sidebar';
import { Header, type HeaderProps } from './slots/header';
import type { Drawer } from '@base-ui/react';

export interface GlassSlots extends BaseSlots {
  header: FC<HeaderProps>;
  sidebar: {
    main: FC<SidebarProps>;
    provider: FC<SidebarProviderProps>;
    use: typeof useSidebar;
    drawer: FC<SidebarDrawerProps>;
    drawerHandle: Drawer.Handle<unknown>;
  };
}

export interface GlassLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
  };
  slots?: Partial<GlassSlots>;
  sidebar?: Omit<SidebarProviderProps, 'children'>;
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

const { useBaseSlots } = baseSlots({
  useProps() {
    return useGlassLayout().props;
  },
});

export function GlassLayout(props: GlassLayoutProps) {
  const { tree, tabs: defaultTabs, aiChat, children, slots: defaultSlots = {} } = props;
  const linkItems = useLinkItems(props);
  const { baseSlots, baseProps } = useBaseSlots(props);

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
    sidebar: defaultSlots.sidebar ?? {
      drawer: SidebarDrawer,
      drawerHandle,
      main: Sidebar,
      provider: SidebarProvider,
      use: useSidebar,
    },
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
      <slots.sidebar.provider {...props.sidebar}>
        <TreeContextProvider tree={tree}>
          <div
            id="fd-glass-layout"
            className="grid overflow-x-clip min-h-dvh [--page-col:900px] [--fd-left-width:0px] [--fd-right-width:0px] has-data-[fd-full=true]:[--page-col:1200px]"
            style={{
              gridTemplate: `"left left-margin main right-margin right" 1fr / var(--fd-left-width) minmax(0,1fr) minmax(0px, var(--page-col)) minmax(0,1fr) var(--fd-right-width)`,
            }}
          >
            <slots.sidebar.drawer />
            <slots.sidebar.main />
            <slots.header />
            {children}
          </div>
        </TreeContextProvider>
      </slots.sidebar.provider>
    </LayoutContext>
  );
}
