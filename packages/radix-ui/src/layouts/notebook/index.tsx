import {
  type ComponentProps,
  createElement,
  type FC,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
} from 'react';
import {
  type BaseLayoutProps,
  parseLayoutProps,
  renderTitleNav,
  useLinkItems,
} from '@/layouts/shared';
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarDrawer,
  SidebarLinkItem,
  SidebarPageTree,
  SidebarTrigger,
  SidebarViewport,
} from './sidebar';
import { TreeContextProvider } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { Languages, Sidebar as SidebarIcon, X } from 'lucide-react';
import { LanguageToggle } from '@/layouts/shared/language-toggle';
import { ThemeToggle } from '@/layouts/shared/theme-toggle';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  LayoutBody,
  LayoutContextProvider,
  LayoutHeader,
  LayoutHeaderTabs,
  NavbarLinkItem,
} from '@/layouts/notebook/client';
import { LargeSearchToggle, SearchToggle } from '@/layouts/shared/search-toggle';
import { LinkItem } from '@/utils/link-item';
import type { SidebarPageTreeComponents } from '@/components/sidebar/page-tree';
import { getSidebarTabs, type GetSidebarTabsOptions } from '@/components/sidebar/tabs';
import { SidebarTabsDropdown, type SidebarTabWithProps } from '@/components/sidebar/tabs/dropdown';
import { type Renderer, renderer } from '@/utils/renderer';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabMode?: 'sidebar' | 'navbar';
  nav?: BaseLayoutProps['nav'] & {
    mode?: 'top' | 'auto';
  };
  sidebar?: SidebarOptions;

  SidebarTrigger?: Renderer<ComponentProps<'button'>>;
  Container?: Renderer<ComponentProps<'div'>>;

  /**
   * @deprecated use `Container` instead.
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

interface SidebarOptions
  extends
    ComponentProps<'aside'>,
    Pick<ComponentProps<typeof Sidebar>, 'defaultOpenLevel' | 'prefetch'> {
  components?: Partial<SidebarPageTreeComponents>;

  /**
   * Root Toggle options
   */
  tabs?: SidebarTabWithProps[] | GetSidebarTabsOptions | false;

  banner?: ReactNode | FC<ComponentProps<'div'>>;
  footer?: ReactNode | FC<ComponentProps<'div'>>;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export function DocsLayout(props: DocsLayoutProps) {
  const {
    tabMode = 'sidebar',
    nav = {},
    sidebar: { tabs: tabOptions, defaultOpenLevel, prefetch, ...sidebarProps } = {},
    LanguageSwitch,
    SearchToggle: searchToggleRenderer,
    LargeSearchToggle: largeSearchToggleRenderer,
    ThemeSwitch,
    SidebarTrigger: SidebarTriggerRenderer = true,
    containerProps,
    Container = containerProps ?? true,
    tree,
    children,
  } = parseLayoutProps(props);
  const navMode = nav.mode ?? 'auto';
  const { menuItems, navItems } = useLinkItems(props);
  const renderSearchToggle = renderer(searchToggleRenderer, SearchToggle);
  const renderLargeSearchToggle = renderer(largeSearchToggleRenderer, LargeSearchToggle);
  const renderThemeSwitch = renderer(ThemeSwitch, ThemeToggle);
  const renderLanguageSwitch = renderer(LanguageSwitch, LanguageToggle);
  const renderSidebarTrigger = renderer(SidebarTriggerRenderer, SidebarTrigger);

  const tabs = useMemo(() => {
    if (Array.isArray(tabOptions)) {
      return tabOptions;
    }

    if (typeof tabOptions === 'object') {
      return getSidebarTabs(tree, tabOptions);
    }

    if (tabOptions !== false) {
      return getSidebarTabs(tree);
    }

    return [];
  }, [tabOptions, tree]);

  function sidebar() {
    const { banner, footer, components, collapsible = true, ...rest } = sidebarProps;
    const iconLinks = menuItems.filter((item) => item.type === 'icon');

    function renderHeader(props: ComponentProps<'div'>) {
      if (typeof banner === 'function') return createElement(banner, props);

      return (
        <div
          {...props}
          className={cn('flex flex-col gap-3 p-4 pb-2 empty:hidden', props.className)}
        >
          {props.children}
          {banner}
        </div>
      );
    }

    function renderFooter(props: ComponentProps<'div'>) {
      if (typeof footer === 'function') return createElement(footer, props);

      return (
        <div
          {...props}
          className={cn(
            'hidden flex-row text-fd-muted-foreground items-center border-t p-4 pt-2',
            iconLinks.length > 0 && 'max-lg:flex',
            props.className,
          )}
        >
          {props.children}
          {footer}
        </div>
      );
    }

    const viewport = (
      <SidebarViewport>
        {menuItems
          .filter((item) => item.type !== 'icon')
          .map((item, i, arr) => (
            <SidebarLinkItem
              key={i}
              item={item}
              className={cn('lg:hidden', i === arr.length - 1 && 'mb-4')}
            />
          ))}

        <SidebarPageTree {...components} />
      </SidebarViewport>
    );

    return (
      <>
        <SidebarContent {...rest}>
          {renderHeader({
            children: (
              <>
                {navMode === 'auto' && (
                  <div className="flex justify-between">
                    {renderTitleNav(nav, {
                      className: 'inline-flex items-center gap-2.5 font-medium',
                    })}
                    {collapsible && (
                      <SidebarCollapseTrigger
                        className={cn(
                          buttonVariants({
                            color: 'ghost',
                            size: 'icon-sm',
                            className: 'mt-px mb-auto text-fd-muted-foreground',
                          }),
                        )}
                      >
                        <SidebarIcon />
                      </SidebarCollapseTrigger>
                    )}
                  </div>
                )}
                {tabs.length > 0 && (
                  <SidebarTabsDropdown
                    options={tabs}
                    className={cn(tabMode === 'navbar' && 'lg:hidden')}
                  />
                )}
              </>
            ),
          })}
          {viewport}
          {renderFooter({
            children: iconLinks.map((item, i) => (
              <LinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({
                    size: 'icon-sm',
                    color: 'ghost',
                    className: 'lg:hidden',
                  }),
                )}
                aria-label={item.label}
              >
                {item.icon}
              </LinkItem>
            )),
          })}
        </SidebarContent>
        <SidebarDrawer {...rest}>
          {renderHeader({
            children: (
              <>
                <SidebarTrigger
                  className={cn(
                    buttonVariants({
                      size: 'icon-sm',
                      color: 'ghost',
                      className: 'ms-auto text-fd-muted-foreground',
                    }),
                  )}
                >
                  <X />
                </SidebarTrigger>
                {tabs.length > 0 && <SidebarTabsDropdown options={tabs} />}
              </>
            ),
          })}
          {viewport}
          {renderFooter({
            className: cn(
              'hidden flex-row items-center justify-end',
              (renderLanguageSwitch || renderThemeSwitch) && 'flex',
              iconLinks.length > 0 && 'max-lg:flex',
            ),
            children: (
              <>
                {iconLinks.map((item, i) => (
                  <LinkItem
                    key={i}
                    item={item}
                    className={cn(
                      buttonVariants({
                        size: 'icon-sm',
                        color: 'ghost',
                      }),
                      'text-fd-muted-foreground lg:hidden',
                      i === iconLinks.length - 1 && 'me-auto',
                    )}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </LinkItem>
                ))}
                {renderLanguageSwitch?.((o) => ({
                  children: <Languages className="size-4.5 text-fd-muted-foreground" />,
                  ...o,
                }))}
                {renderThemeSwitch?.((t) => t ?? {})}
              </>
            ),
          })}
        </SidebarDrawer>
      </>
    );
  }

  function header() {
    const sidebarCollapsible = sidebarProps.collapsible ?? true;
    const showLayoutTabs = tabMode === 'navbar' && tabs.length > 0;

    return (
      <LayoutHeader
        id="nd-subnav"
        className={cn(
          'sticky [grid-area:header] flex flex-col top-(--fd-docs-row-1) z-10 backdrop-blur-sm transition-colors data-[transparent=false]:bg-fd-background/80 layout:[--fd-header-height:--spacing(14)]',
          showLayoutTabs && 'lg:layout:[--fd-header-height:--spacing(24)]',
        )}
      >
        <div data-header-body="" className="flex border-b px-4 gap-2 h-14 md:px-6">
          <div
            className={cn(
              'items-center',
              navMode === 'top' && 'flex flex-1',
              navMode === 'auto' && 'hidden has-data-[collapsed=true]:md:flex max-md:flex',
            )}
          >
            {sidebarCollapsible && navMode === 'auto' && (
              <SidebarCollapseTrigger
                className={cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                  }),
                  'text-fd-muted-foreground data-[collapsed=false]:hidden max-md:hidden',
                )}
              >
                <SidebarIcon />
              </SidebarCollapseTrigger>
            )}
            {renderTitleNav(nav, {
              className: cn(
                'inline-flex items-center gap-2.5 font-semibold',
                navMode === 'auto' && 'md:hidden',
              ),
            })}
            {nav.children}
          </div>
          {renderLargeSearchToggle?.((o) => ({
            hideIfDisabled: true,
            ...o,
            className: cn(
              'w-full my-auto max-md:hidden',
              navMode === 'top' ? 'ps-2.5 rounded-xl max-w-sm' : 'max-w-[240px]',
              o?.className,
            ),
          }))}
          <div className="flex flex-1 items-center justify-end md:gap-2">
            <div className="flex items-center gap-6 empty:hidden max-lg:hidden">
              {navItems
                .filter((item) => item.type !== 'icon')
                .map((item, i) => (
                  <NavbarLinkItem key={i} item={item} />
                ))}
            </div>
            {navItems
              .filter((item) => item.type === 'icon')
              .map((item, i) => (
                <LinkItem
                  key={i}
                  item={item}
                  className={cn(
                    buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                    'text-fd-muted-foreground max-lg:hidden',
                  )}
                  aria-label={item.label}
                >
                  {item.icon}
                </LinkItem>
              ))}

            <div className="flex items-center md:hidden">
              {renderSearchToggle?.((o) => ({
                hideIfDisabled: true,
                ...o,
                className: cn('p-2', o?.className),
              }))}
              {renderSidebarTrigger?.((t) => ({
                children: <SidebarIcon />,
                ...t,
                className: cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                  }),
                  'p-2 -me-1.5',
                  t?.className,
                ),
              }))}
            </div>

            <div className="flex items-center gap-2 max-md:hidden">
              {renderLanguageSwitch?.((o) => ({
                children: <Languages className="size-4.5 text-fd-muted-foreground" />,
                ...o,
              }))}
              {renderThemeSwitch?.((t) => t ?? {})}
              {sidebarCollapsible && navMode === 'top' && (
                <SidebarCollapseTrigger
                  className={cn(
                    buttonVariants({
                      color: 'secondary',
                      size: 'icon-sm',
                    }),
                    'text-fd-muted-foreground rounded-full -me-1.5',
                  )}
                >
                  <SidebarIcon />
                </SidebarCollapseTrigger>
              )}
            </div>
          </div>
        </div>
        {showLayoutTabs && (
          <LayoutHeaderTabs
            data-header-tabs=""
            className="overflow-x-auto border-b px-6 h-10 max-lg:hidden"
            options={tabs}
          />
        )}
      </LayoutHeader>
    );
  }

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContextProvider
        navMode={navMode}
        tabMode={tabMode}
        navTransparentMode={nav.transparentMode}
      >
        <Sidebar defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
          <LayoutBody _={Container}>
            {sidebar()}
            {header()}
            {children}
          </LayoutBody>
        </Sidebar>
      </LayoutContextProvider>
    </TreeContextProvider>
  );
}
