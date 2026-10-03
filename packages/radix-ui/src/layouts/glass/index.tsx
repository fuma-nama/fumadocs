'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  type AIChatOptions,
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
import { AIChatPanel } from '@/layouts/shared/client';
import { TreeContextProvider } from '@/contexts/tree';
import { createContext, type FC, use, useMemo } from 'react';
import {
  Sidebar,
  SidebarDrawer,
  SidebarProvider,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
  type SidebarDrawerProps,
} from './slots/sidebar';
import { Header, type HeaderProps } from './slots/header';

export interface DocsSlots extends BaseSlots {
  header: FC<HeaderProps>;
  sidebar: {
    main: FC<SidebarProps>;
    provider: FC<SidebarProviderProps>;
    use: typeof useSidebar;
    drawer: FC<SidebarDrawerProps>;
  };
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: AIChatOptions;
  slots?: Partial<DocsSlots>;
  sidebar?: Omit<SidebarProviderProps, 'children'>;
}

interface SlotsProps extends BaseSlotsProps<DocsLayoutProps> {
  tabs: LayoutTab[];
  aiChat?: DocsLayoutProps['aiChat'];
}

const LayoutContext = createContext<{
  props: SlotsProps;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: DocsSlots;
} | null>(null);

export function useGlassLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use Glass layout components under <DocsLayout /> (`fumadocs-ui/layouts/glass`).',
    );
  return context;
}

const { useBaseSlots } = baseSlots({
  useProps() {
    return useGlassLayout().props;
  },
});

export function DocsLayout(props: DocsLayoutProps) {
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

  const slots: DocsSlots = {
    ...baseSlots,
    header: defaultSlots.header ?? Header,
    sidebar: defaultSlots.sidebar ?? {
      drawer: SidebarDrawer,
      main: Sidebar,
      provider: SidebarProvider,
      use: useSidebar,
    },
  };

  const leftSpace = 'calc(50% - var(--fd-main-width)/2 - var(--fd-left-width))';
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
            data-ai-chat={aiChat?.open && aiChat.panel ? '' : undefined}
            className="grid overflow-x-clip min-h-dvh [--fd-main-width:900px] [--fd-left-width:0px] [--fd-right-width:0px]"
            style={{
              gridTemplate: `"left left-margin main right-margin right" 1fr / var(--fd-left-width) ${leftSpace} 1fr minmax(calc(50% - var(--fd-main-width)/2 - var(--fd-right-width) + min(${leftSpace}, 0px)), auto) var(--fd-right-width)`,
            }}
          >
            <slots.sidebar.drawer />
            <slots.sidebar.main />
            <slots.header />
            {children}
            {aiChat?.panel && (
              <AIChatPanel
                open={aiChat.open}
                className="[grid-area:right/right-margin/right/right] justify-self-end xl:sticky xl:top-[calc(var(--fd-header-height)+--spacing(2))] xl:h-[calc(100dvh-var(--fd-header-height)---spacing(4))] xl:me-2 xl:rounded-2xl xl:border xl:bg-fd-popover xl:shadow-sm"
              >
                {aiChat.panel}
              </AIChatPanel>
            )}
          </div>
        </TreeContextProvider>
      </slots.sidebar.provider>
    </LayoutContext>
  );
}

export {
  DocsLayout as GlassLayout,
  type DocsLayoutProps as GlassLayoutProps,
  type DocsSlots as GlassSlots,
};
