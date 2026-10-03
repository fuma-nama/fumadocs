'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import { type ComponentProps, createContext, type FC, use, useMemo } from 'react';
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
import { TreeContextProvider } from '@/contexts/tree';
import {
  Sidebar,
  SidebarDrawer,
  SidebarProvider,
  type SidebarProps,
  type SidebarProviderProps,
} from './slots/sidebar';
import { Header } from './slots/header';
import { AIChatPanel } from '@/layouts/shared/client';
import { HeaderActions } from './slots/actions';

export interface DocsSlots extends BaseSlots {
  header: FC<ComponentProps<'header'>>;
  /**
   * The actions at the top right of page panel
   */
  actions: FC<ComponentProps<'div'>>;
  sidebar: {
    provider: FC<SidebarProviderProps>;
    main: FC<SidebarProps>;
    drawer: FC;
  };
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  aiChat?: AIChatOptions;
  sidebar?: Omit<SidebarProviderProps, 'children'>;
  slots?: Partial<DocsSlots>;
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

export function useSpaciousLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use Spacious layout components under <DocsLayout /> (`fumadocs-ui/layouts/spacious`).',
    );
  return context;
}

const { useBaseSlots } = baseSlots({
  useProps() {
    return useSpaciousLayout().props;
  },
});

export function DocsLayout(props: DocsLayoutProps) {
  const { tree, tabs: tabsOptions, aiChat, sidebar, slots: customSlots = {}, children } = props;
  const linkItems = useLinkItems(props);
  const { baseSlots, baseProps } = useBaseSlots(props);
  const tabs = useMemo(() => {
    if (Array.isArray(tabsOptions)) return tabsOptions;
    if (tabsOptions === false) return [];
    return getLayoutTabs(tree, { transform: (option) => option, ...tabsOptions });
  }, [tree, tabsOptions]);

  const slots: DocsSlots = {
    ...baseSlots,
    header: customSlots.header ?? Header,
    actions: customSlots.actions ?? HeaderActions,
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
            className="relative grid min-h-(--fd-layout-height) transition-[grid-template-columns] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none [--fd-layout-height:calc(100dvh-var(--fd-banner-height,0px))] [--fd-header-height:--spacing(14)] [--fd-page-width:760px] [--fd-sidebar-width:0px] [--fd-sidebar-col:var(--fd-sidebar-width)] [--fd-toc-width:0px] md:h-(--fd-layout-height) md:overflow-clip md:bg-fd-card print:h-auto print:overflow-visible"
            style={{
              gridTemplate: `"sidebar header right" auto
"sidebar main right" 1fr / var(--fd-sidebar-col) minmax(0, 1fr) auto`,
            }}
          >
            <slots.sidebar.main />
            <slots.header />
            {children}
            {aiChat?.panel && (
              <AIChatPanel
                open={aiChat.open}
                className="[grid-area:right] xl:my-2 xl:me-2 xl:rounded-2xl xl:border xl:bg-fd-background xl:shadow-sm"
              >
                {aiChat.panel}
              </AIChatPanel>
            )}
            <slots.sidebar.drawer />
          </div>
        </slots.sidebar.provider>
      </TreeContextProvider>
    </LayoutContext>
  );
}
