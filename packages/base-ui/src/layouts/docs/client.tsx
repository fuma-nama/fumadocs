'use client';

import { type ComponentProps, createContext, type FC, use, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { usePathname } from 'fumadocs-core/framework';
import Link from 'fumadocs-core/link';
import { useIsScrollTop } from '@/utils/use-is-scroll-top';
import type { LinkItemType } from '@/layouts/shared';
import {
  Sidebar,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  type SidebarProps,
  type SidebarProviderProps,
} from './slots/sidebar';
import type { DocsLayoutProps } from '.';
import {
  baseSlots,
  isLayoutTabActive,
  useLinkItems,
  type LayoutTab,
  type BaseSlots,
  type BaseSlotsProps,
} from '../shared';
import { TreeContextProvider } from '@/contexts/tree';
import { Header } from './slots/header';
import { Container } from './slots/container';

export interface DocsSlots extends BaseSlots {
  container: FC<ComponentProps<'div'>>;
  header: FC<ComponentProps<'header'>>;
  sidebar: {
    provider: FC<SidebarProviderProps>;
    root: FC<SidebarProps>;
    trigger: FC<ComponentProps<'button'>>;
    useSidebar: () => { collapsed: boolean; open: boolean; setOpen: (v: boolean) => void };
  };
}

const { useProvider } = baseSlots({
  useProps() {
    return useDocsLayout().props;
  },
});

interface SlotsProps extends BaseSlotsProps<DocsLayoutProps> {
  tabs: LayoutTab[];
  tabMode: NonNullable<DocsLayoutProps['tabMode']>;
}

const LayoutContext = createContext<{
  props: SlotsProps;
  isNavTransparent: boolean;
  navItems: LinkItemType[];
  menuItems: LinkItemType[];
  slots: DocsSlots;
} | null>(null);

export function useIsDocsLayout() {
  return use(LayoutContext) !== null;
}

export function useDocsLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use <DocsPage /> (`fumadocs-ui/layouts/docs/page`) under <DocsLayout /> (`fumadocs-ui/layouts/docs`).',
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
    sidebar: { enabled: sidebarEnabled = true, defaultOpenLevel, prefetch, ...sidebarProps } = {},
    slots: defaultSlots,
    tabs,
    tabMode = 'auto',
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
      useSidebar: useSidebar,
    },
  };

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContext
        value={{
          props: {
            tabMode,
            tabs,
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
            {sidebarEnabled && <slots.sidebar.root {...sidebarProps} />}
            {tabMode === 'top' && tabs.length > 0 && (
              <LayoutTabs
                tabs={tabs}
                className="z-10 bg-fd-background border-b px-6 pt-3 xl:px-8 max-md:hidden"
              />
            )}
            {children}
          </slots.container>
        </slots.sidebar.provider>
      </LayoutContext>
    </TreeContextProvider>
  );
}

function LayoutTabs({
  tabs,
  ...props
}: ComponentProps<'div'> & {
  tabs: LayoutTab[];
}) {
  const pathname = usePathname();
  const selected = useMemo(() => {
    return tabs.findLast((option) => isLayoutTabActive(option, pathname));
  }, [tabs, pathname]);

  return (
    <div
      {...props}
      className={cn(
        'flex flex-row items-end gap-6 overflow-auto [grid-area:main]',
        props.className,
      )}
    >
      {tabs.map((tab, i) => (
        <Link
          key={i}
          href={tab.url}
          className={cn(
            'inline-flex border-b-2 border-transparent transition-colors items-center pb-1.5 font-medium gap-2 text-fd-muted-foreground text-sm text-nowrap hover:text-fd-accent-foreground',
            tab.unlisted && selected !== tab && 'hidden',
            selected === tab && 'border-fd-primary text-fd-primary',
          )}
        >
          {tab.title}
        </Link>
      ))}
    </div>
  );
}
