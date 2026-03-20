'use client';
import { type ComponentProps, createContext, type FC, use } from 'react';
import { type DocsLayoutProps } from '.';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';
import { type LinkItemType } from '@/layouts/shared';
import {
  baseSlots,
  type BaseSlots,
  type BaseSlotsProps,
  type LayoutTab,
  useLinkItems,
} from '../shared';
import { TreeContextProvider } from '@/contexts/tree';
import { Container } from './slots/container';
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from './slots/sidebar';
import { Header } from './slots/header';

export interface DocsSlots extends BaseSlots {
  container: FC<ComponentProps<'div'>>;
  header: FC<ComponentProps<'header'>>;
  sidebar: {
    provider: FC<SidebarProviderProps>;
    root: FC<SidebarProps>;
    trigger: FC<ComponentProps<'button'>>;
    collapseTrigger: FC<ComponentProps<'button'>>;
    useSidebar: () => { collapsed: boolean; open: boolean; setOpen: (V: boolean) => void };
  };
}

const { useProvider } = baseSlots({
  useProps() {
    return useNotebookLayout().props;
  },
});

interface SlotsProps extends BaseSlotsProps<DocsLayoutProps> {
  sidebar: SidebarProps;
  tabMode: NonNullable<DocsLayoutProps['tabMode']>;
  tabs: LayoutTab[];
}

const LayoutContext = createContext<{
  props: SlotsProps;
  isNavTransparent: boolean;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: DocsSlots;
} | null>(null);

export function useNotebookLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use <DocsPage /> (`fumadocs-ui/layouts/notebook/page`) under <DocsLayout /> (`fumadocs-ui/layouts/notebook`).',
    );
  return context;
}

export function LayoutBody(
  props: Omit<DocsLayoutProps, 'tabs'> & {
    tabs: LayoutTab[];
  },
) {
  const {
    nav: { enabled: navEnabled = true, transparentMode: navTransparentMode = 'none' } = {},
    sidebar: { defaultOpenLevel, prefetch, ...sidebarProps } = {},
    slots: defaultSlots,
    tabMode = 'sidebar',
    tabs,
    tree,
    containerProps,
    children,
  } = props;
  const isTop = useIsScrollTop({ enabled: navTransparentMode === 'top' }) ?? true;
  const isNavTransparent = navTransparentMode === 'top' ? isTop : navTransparentMode === 'always';
  const { baseSlots, baseProps } = useProvider(props);
  const linkItems = useLinkItems(props);
  const slots: DocsSlots = {
    ...baseSlots,
    header: defaultSlots?.header ?? Header,
    container: defaultSlots?.container ?? Container,
    sidebar: defaultSlots?.sidebar ?? {
      provider: SidebarProvider,
      root: Sidebar,
      trigger: SidebarTrigger,
      collapseTrigger: SidebarCollapseTrigger,
      useSidebar,
    },
  };

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContext
        value={{
          props: {
            tabs,
            tabMode,
            sidebar: sidebarProps,
            ...baseProps,
          },
          isNavTransparent,
          slots,
          ...linkItems,
        }}
      >
        <slots.sidebar.provider defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
          <slots.container {...containerProps}>
            {navEnabled && <slots.header />}
            <slots.sidebar.root {...sidebarProps} />
            {children}
          </slots.container>
        </slots.sidebar.provider>
      </LayoutContext>
    </TreeContextProvider>
  );
}
