'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  type BaseLayoutProps,
  baseSlots,
  type BaseSlots,
  type BaseSlotsProps,
  getLayoutTabs,
  type GetLayoutTabsOptions,
  type LayoutTab,
  useLinkItems,
} from '@/layouts/shared';
import { TreeContextProvider } from '@/contexts/tree';
import { type ComponentProps, createContext, type FC, type ReactNode, use, useMemo } from 'react';
import { cn } from '@/utils/cn';
import { TabDropdown, type TabDropdownProps } from './slots/tab-dropdown';
import { buttonVariants } from '@/components/ui/button';
import { Languages } from 'lucide-react';
import { LinkItem, type LinkItemType } from '@/layouts/shared';
import { motion } from 'motion/react';
import { RemoveScroll } from 'react-remove-scroll';
import { useSearchContext } from '@/contexts/search';
import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  useSidebar,
  type SidebarProviderProps,
  type SidebarProps,
} from './slots/sidebar';
import { Container } from './slots/container';

export interface DocsSlots extends BaseSlots {
  container: FC<ComponentProps<'div'>>;
  tabDropdown: FC<TabDropdownProps>;
  sidebar: {
    provider: FC<SidebarProviderProps>;
    trigger: FC<ComponentProps<'button'>>;
    root: FC<SidebarProps>;
    useSidebar: () => { collapsed: boolean; open: boolean; setOpen: (v: boolean) => void };
  };
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  sidebar?: SidebarOptions;
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
  slots?: Partial<DocsSlots>;
  renderNavigationPanel?: (props: NavigationPanelProps) => ReactNode;

  containerProps?: ComponentProps<'div'>;
}

interface SidebarOptions extends SidebarProps, SidebarProviderProps {
  enabled?: boolean;
  /**
   * @deprecated use layout-level `tabs` instead.
   */
  tabs?: LayoutTab[] | GetLayoutTabsOptions | false;
}

const LayoutContext = createContext<{
  props: BaseSlotsProps;
  menuItems: LinkItemType[];
  navItems: LinkItemType[];
  slots: DocsSlots;
} | null>(null);

export function useFluxLayout() {
  const context = use(LayoutContext);
  if (!context)
    throw new Error(
      'Please use Flux layout components under <DocsLayout /> (`fumadocs-ui/layouts/flux`).',
    );
  return context;
}

const { useProvider } = baseSlots({
  useProps() {
    return useFluxLayout().props;
  },
});

export function DocsLayout(props: DocsLayoutProps) {
  const {
    tree,
    nav = {},
    sidebar: {
      enabled: sidebarEnabled = true,
      tabs: _tabs,
      defaultOpenLevel,
      prefetch,
      ...sidebarProps
    } = {},
    tabs: defaultTabs = _tabs,
    children,
    containerProps,
    renderNavigationPanel = (props) => <NavigationPanel {...props} />,
    slots: defaultSlots = {},
  } = props;
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
  const slots: DocsSlots = {
    ...baseSlots,
    container: defaultSlots.container ?? Container,
    tabDropdown: defaultSlots.tabDropdown ?? TabDropdown,
    sidebar: defaultSlots.sidebar ?? {
      root: Sidebar,
      provider: SidebarProvider,
      trigger: SidebarTrigger,
      useSidebar,
    },
  };

  return (
    <LayoutContext
      value={{
        props: baseProps,
        slots,
        ...linkItems,
      }}
    >
      <TreeContextProvider tree={tree}>
        <slots.sidebar.provider defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
          <slots.container {...containerProps}>
            {sidebarEnabled && <slots.sidebar.root {...sidebarProps} />}
            {children}
          </slots.container>
        </slots.sidebar.provider>
        {renderNavigationPanel({
          head: (
            <>
              {slots.navTitle && (
                <slots.navTitle className="inline-flex items-center gap-2.5 text-sm font-semibold" />
              )}
              {nav.children}
            </>
          ),
          tabDropdown: slots.tabDropdown && tabs.length > 0 && (
            <slots.tabDropdown className="flex-1" tabs={tabs} />
          ),
          tool: (
            <>
              {slots.languageSelect && (
                <slots.languageSelect.root>
                  <Languages className="size-4.5" />
                </slots.languageSelect.root>
              )}
              {slots.searchTrigger && (
                <slots.searchTrigger.sm hideIfDisabled className="rounded-lg" />
              )}
              {slots.sidebar && (
                <slots.sidebar.trigger
                  className={cn(
                    buttonVariants({
                      variant: 'ghost',
                      size: 'icon-sm',
                      className: 'overflow-hidden',
                    }),
                  )}
                />
              )}
              {slots.themeSwitch && (
                <slots.themeSwitch className="p-1 h-full ms-1 rounded-xl bg-fd-muted *:rounded-lg" />
              )}
            </>
          ),
          link: linkItems.menuItems
            .filter((item) => item.type === 'icon')
            .map((item, i) => (
              <LinkItem
                key={i}
                item={item}
                className={cn(buttonVariants({ size: 'icon-sm', color: 'ghost' }))}
                aria-label={item.label}
              >
                {item.icon}
              </LinkItem>
            )),
        })}
      </TreeContextProvider>
    </LayoutContext>
  );
}

export interface NavigationPanelProps {
  head: ReactNode;
  tabDropdown: ReactNode;
  tool: ReactNode;
  link: ReactNode;
}

export function NavigationPanel({
  head,
  tabDropdown,
  tool,
  link,
  children = (v) => v,
  ...props
}: NavigationPanelProps &
  Omit<ComponentProps<typeof motion.div>, 'children'> & {
    /**
     * replace default children
     */
    children?: (defaultChildren: ReactNode) => ReactNode;
  }) {
  const { open } = useSearchContext();
  return (
    <motion.div
      {...props}
      className={cn(
        'fixed left-1/2 w-[calc(100%-var(--removed-body-scroll-bar-size,0px))] translate-x-[calc(-50%-var(--removed-body-scroll-bar-size,0px)/2)] bottom-0 z-40 bg-fd-popover text-fd-popover-foreground border-t shadow-lg sm:bottom-6 sm:rounded-2xl sm:border sm:max-w-[380px]',
        props.className,
      )}
      animate={
        props.animate ?? {
          scale: open ? 0.9 : 1,
          translateY: open ? 20 : 0,
          opacity: open ? 0.8 : 1,
        }
      }
    >
      {children(
        <>
          <div className="flex flex-row items-center ps-2.5 p-1 gap-2 min-h-11">
            {head}
            <div id="flux-layout-slot" className="flex-1" />
          </div>

          <div className="flex flex-row gap-1.5 overflow-x-auto overflow-y-hidden p-2 sm:p-1">
            <div className="flex flex-row items-center gap-2 min-w-0 flex-1">{tabDropdown}</div>

            <div className="flex flex-row items-center text-fd-muted-foreground border-x px-0.5 empty:hidden">
              {link}
            </div>

            <div className="flex flex-row items-center text-fd-muted-foreground empty:hidden">
              {tool}
            </div>
          </div>
        </>,
      )}
    </motion.div>
  );
}

export function NavigationPanelOverlay({
  enabled = false,
  className,
  ...props
}: ComponentProps<typeof motion.div> & { enabled?: boolean }) {
  return (
    <RemoveScroll enabled={enabled}>
      <motion.div
        className={cn(
          'fixed inset-0 z-30 pr-(--removed-body-scroll-bar-size,0) backdrop-blur-md bg-fd-background/60',
          !enabled && 'pointer-events-none',
          className,
        )}
        initial="hide"
        variants={{
          show: {
            opacity: 1,
          },
          hide: {
            opacity: 0,
          },
        }}
        animate={enabled ? 'show' : 'hide'}
        exit="hide"
        {...props}
      />
    </RemoveScroll>
  );
}
