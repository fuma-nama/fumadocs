'use client';
import type * as PageTree from 'fumadocs-core/page-tree';
import type { BaseLayoutProps } from '@/layouts/shared';
import { TreeContextProvider } from '@/contexts/tree';
import { getSidebarTabs, type GetSidebarTabsOptions } from '@/components/sidebar/tabs';
import type { SidebarPageTreeComponents } from '@/components/sidebar/page-tree';
import { type ComponentProps, HTMLAttributes, type ReactNode, useMemo } from 'react';
import { cn } from '@fumadocs/ui/cn';
import { SidebarViewport, useSidebar } from '@/components/sidebar/base';
import { SidebarTabsDropdown, type SidebarTabWithProps } from './tab-dropdown';
import { Sidebar, SidebarContent, SidebarLinkItem, SidebarPageTree } from './sidebar';
import { buttonVariants } from '@/components/ui/button';
import { Languages, SidebarIcon, XIcon } from 'lucide-react';
import { renderTitleNav, useLinkItems } from '../shared';
import { LanguageToggle } from '../shared/language-toggle';
import { SearchToggle } from '../shared/search-toggle';
import { ThemeToggle } from '../shared/theme-toggle';
import { LinkItem } from '@fumadocs/ui/link-item';
import { AnimatePresence, motion } from 'motion/react';
import { RemoveScroll } from 'react-remove-scroll';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: SidebarOptions;

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;

  renderNavigationPanel?: (props: NavigationPanelProps) => ReactNode;
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
  tree,
  nav = {},
  sidebar: {
    enabled: sidebarEnabled = true,
    tabs: sidebarTabs,
    defaultOpenLevel,
    prefetch,
    ...sidebarProps
  } = {},
  searchToggle = {},
  themeSwitch = {},
  i18n = false,
  children,
  containerProps,
  renderNavigationPanel = (props) => <NavigationPanel {...props} />,
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
  const { menuItems } = useLinkItems(props);
  const iconLinks = menuItems.filter((item) => item.type === 'icon');

  function sidebar() {
    const { footer, banner, component, components, ...rest } = sidebarProps;
    if (component) return component;

    return (
      <SidebarContent {...rest}>
        <div className="flex flex-col gap-3 p-4 pb-2 empty:hidden">{banner}</div>
        <SidebarViewport>
          {menuItems
            .filter((v) => v.type !== 'icon')
            .map((item, i, list) => (
              <SidebarLinkItem
                key={i}
                item={item}
                className={cn(i === list.length - 1 && 'mb-4')}
              />
            ))}
          <SidebarPageTree {...components} />
        </SidebarViewport>
        {footer}
      </SidebarContent>
    );
  }

  return (
    <TreeContextProvider tree={tree}>
      <Sidebar defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
        <div
          id="nd-flux-layout"
          {...containerProps}
          className={cn(
            'flex flex-col items-center pb-24 overflow-x-clip',
            containerProps?.className,
          )}
        >
          {sidebarEnabled && sidebar()}
          {children}
        </div>
        {renderNavigationPanel({
          head: renderTitleNav(nav, {
            className: 'inline-flex items-center gap-2.5 text-sm font-semibold',
          }),
          tabDropdown: tabs.length > 0 && <SidebarTabsDropdown className="flex-1" options={tabs} />,
          tool: (
            <>
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-4.5" />
                </LanguageToggle>
              )}

              {searchToggle.enabled !== false &&
                (searchToggle.components?.sm ?? (
                  <SearchToggle className="rounded-lg" hideIfDisabled />
                ))}

              <NavigationSidebarTrigger />
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle className="p-0 ms-1" mode={themeSwitch.mode} />
                ))}
            </>
          ),
          link: iconLinks.map((item, i) => (
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
      </Sidebar>
    </TreeContextProvider>
  );
}

function NavigationSidebarTrigger() {
  const { open, setOpen } = useSidebar();
  return (
    <button
      className={cn(
        buttonVariants({
          variant: 'ghost',
          size: 'icon-sm',
          className: 'overflow-hidden',
        }),
      )}
      onClick={() => setOpen((prev) => !prev)}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={open ? 'open' : 'closed'}
          transition={{ duration: 0.2 }}
          initial={{
            y: '100%',
            opacity: 0,
          }}
          animate={{
            y: 0,
            opacity: 1,
          }}
          exit={{
            y: '100%',
            opacity: 0,
          }}
        >
          {open ? <XIcon /> : <SidebarIcon />}
        </motion.span>
      </AnimatePresence>
    </button>
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
  className,
  children = (v) => v,
  ...props
}: NavigationPanelProps &
  Omit<ComponentProps<typeof motion.div>, 'children'> & {
    /**
     * replace default children
     */
    children?: (defaultChildren: ReactNode) => ReactNode;
  }) {
  return (
    <motion.div
      className={cn(
        'fixed left-1/2 w-[calc(100%-var(--removed-body-scroll-bar-size,0px))] translate-x-[calc(-50%-var(--removed-body-scroll-bar-size,0px)/2)] bottom-0 z-40 bg-fd-popover text-fd-popover-foreground border-t shadow-lg sm:bottom-6 sm:rounded-2xl sm:border sm:max-w-[380px]',
        className,
      )}
      {...props}
    >
      {children(
        <>
          <div className="flex flex-row items-center ps-2.5 p-1 gap-2 min-h-11">
            {head}
            <div id="flux-layout-slot" className="flex-1" />
          </div>

          <div className="flex flex-row items-center gap-1.5 overflow-x-auto overflow-y-hidden p-2 sm:p-1">
            <div className="flex flex-row items-center gap-2 flex-1 empty:hidden">
              {tabDropdown}
            </div>

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
