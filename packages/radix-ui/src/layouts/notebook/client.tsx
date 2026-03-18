'use client';
import { type ComponentProps, createContext, type FC, use } from 'react';
import { type DocsLayoutProps } from '.';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';
import { type LinkItemType } from '@/utils/link-item';
import { baseSlots, type BaseSlots, type BaseSlotsProps, LayoutTab, useLinkItems } from '../shared';
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
  container?: FC<ComponentProps<'div'>>;
  header?: FC<ComponentProps<'header'>>;
  sidebar?: {
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

type SlotsProps = BaseSlotsProps;

const LayoutContext = createContext<{
  props: SlotsProps;
  tabs: LayoutTab[];
  sidebarCollapsible: boolean;
  isNavTransparent: boolean;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: DocsSlots;
  tabMode: 'sidebar' | 'navbar';
  navMode: 'top' | 'auto';
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
    nav: {
      enabled: navEnabled = true,
      mode: navMode = 'auto',
      transparentMode: navTransparentMode = 'none',
    } = {},
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
    header: navEnabled ? (defaultSlots?.header ?? Header) : undefined,
    container: defaultSlots?.container ?? Container,
    sidebar: defaultSlots?.sidebar ?? {
      provider: SidebarProvider,
      root: Sidebar,
      trigger: SidebarTrigger,
      collapseTrigger: SidebarCollapseTrigger,
      useSidebar,
    },
  };

  let content = (
    <>
      {slots.header && <slots.header />}
      {slots.sidebar && <slots.sidebar.root {...sidebarProps} />}
      {children}
    </>
  );

  if (slots.container) {
    content = <slots.container {...containerProps}>{content}</slots.container>;
  }

  if (slots.sidebar) {
    content = (
      <slots.sidebar.provider defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
        {content}
      </slots.sidebar.provider>
    );
  }

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContext
        value={{
          sidebarCollapsible: sidebarProps.collapsible ?? true,
          props: baseProps,
          tabMode,
          navMode,
          tabs,
          isNavTransparent,
          slots,
          ...linkItems,
        }}
      >
        {content}
      </LayoutContext>
    </TreeContextProvider>
  );
}
