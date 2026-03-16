import type * as PageTree from 'fumadocs-core/page-tree';
import { type ComponentProps, type HTMLAttributes, type ReactNode, useMemo } from 'react';
import { Languages, Sidebar as SidebarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
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
import {
  type BaseLayoutProps,
  parseLayoutProps,
  renderTitleNav,
  useLinkItems,
} from '@/layouts/shared';
import { LinkItem } from '@/utils/link-item';
import { LanguageToggle, LanguageToggleText } from '@/layouts/shared/language-toggle';
import { LayoutBody, LayoutContextProvider, LayoutHeader, LayoutTabs } from './client';
import { TreeContextProvider } from '@/contexts/tree';
import { ThemeToggle } from '../shared/theme-toggle';
import { LargeSearchToggle, SearchToggle } from '@/layouts/shared/search-toggle';
import { getSidebarTabs, type GetSidebarTabsOptions } from '@/components/sidebar/tabs';
import type { SidebarPageTreeComponents } from '@/components/sidebar/page-tree';
import { SidebarTabsDropdown, type SidebarTabWithProps } from '@/components/sidebar/tabs/dropdown';
import { type Renderer, renderer } from '@/utils/renderer';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  sidebar?: SidebarOptions;

  tabMode?: 'top' | 'auto';
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
  enabled?: boolean;
  component?: ReactNode;
  components?: Partial<SidebarPageTreeComponents>;

  /**
   * Root Toggle options
   */
  tabs?: SidebarTabWithProps[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export function DocsLayout(_: DocsLayoutProps) {
  const {
    nav: { transparentMode, ...nav } = {},
    sidebar: {
      tabs: sidebarTabs,
      enabled: sidebarEnabled = true,
      defaultOpenLevel,
      prefetch,
      ...sidebarProps
    } = {},
    SearchToggle: SearchToggleRenderer,
    LargeSearchToggle: LargeSearchToggleRenderer,
    ThemeSwitch,
    containerProps,
    Container = containerProps ?? true,
    tabMode = 'auto',
    LanguageSwitch,
    SidebarTrigger: SidebarTriggerRenderer = sidebarEnabled,
    children,
    tree,
    ...props
  } = parseLayoutProps<DocsLayoutProps>(_);

  const renderSearchToggle = renderer(SearchToggleRenderer, SearchToggle);
  const renderLargeSearchToggle = renderer(LargeSearchToggleRenderer, LargeSearchToggle);
  const renderThemeSwitch = renderer(ThemeSwitch, ThemeToggle);
  const renderLanguageSwitch = renderer(LanguageSwitch, LanguageToggle);
  const renderSidebarTrigger = renderer(SidebarTriggerRenderer, SidebarTrigger);

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

  function sidebar() {
    const { footer, banner, collapsible = true, component, components, ...rest } = sidebarProps;
    if (component) return component;

    const iconLinks = menuItems.filter((item) => item.type === 'icon');
    const viewport = (
      <SidebarViewport>
        {menuItems
          .filter((v) => v.type !== 'icon')
          .map((item, i, list) => (
            <SidebarLinkItem key={i} item={item} className={cn(i === list.length - 1 && 'mb-4')} />
          ))}
        <SidebarPageTree {...components} />
      </SidebarViewport>
    );

    return (
      <>
        <SidebarContent {...rest}>
          <div className="flex flex-col gap-3 p-4 pb-2">
            <div className="flex">
              {renderTitleNav(nav, {
                className: 'inline-flex text-[0.9375rem] items-center gap-2.5 font-medium me-auto',
              })}
              {nav.children}
              {collapsible && (
                <SidebarCollapseTrigger
                  className={cn(
                    buttonVariants({
                      color: 'ghost',
                      size: 'icon-sm',
                      className: 'mb-auto text-fd-muted-foreground',
                    }),
                  )}
                >
                  <SidebarIcon />
                </SidebarCollapseTrigger>
              )}
            </div>
            {renderLargeSearchToggle?.((o) => ({
              hideIfDisabled: true,
              ...o,
            }))}
            {tabs.length > 0 && tabMode === 'auto' && <SidebarTabsDropdown options={tabs} />}
            {banner}
          </div>
          {viewport}
          {(renderLanguageSwitch || iconLinks.length > 0 || renderThemeSwitch || footer) && (
            <div className="flex flex-col border-t p-4 pt-2 empty:hidden">
              <div className="flex text-fd-muted-foreground items-center empty:hidden">
                {renderLanguageSwitch?.((o) => ({
                  children: <Languages className="size-4.5" />,
                  ...o,
                }))}
                {iconLinks.map((item, i) => (
                  <LinkItem
                    key={i}
                    item={item}
                    className={cn(buttonVariants({ size: 'icon-sm', color: 'ghost' }))}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </LinkItem>
                ))}
                {renderThemeSwitch?.((t) => ({ ...t, className: cn('ms-auto p-0', t?.className) }))}
              </div>
              {footer}
            </div>
          )}
        </SidebarContent>
        <SidebarDrawer>
          <div className="flex flex-col gap-3 p-4 pb-2">
            <div className="flex text-fd-muted-foreground items-center gap-1.5">
              <div className="flex flex-1">
                {iconLinks.map((item, i) => (
                  <LinkItem
                    key={i}
                    item={item}
                    className={cn(
                      buttonVariants({
                        size: 'icon-sm',
                        color: 'ghost',
                        className: 'p-2',
                      }),
                    )}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </LinkItem>
                ))}
              </div>
              {renderLanguageSwitch?.((o) => ({
                children: (
                  <>
                    <Languages className="size-4.5" />
                    <LanguageToggleText />
                  </>
                ),
                ...o,
              }))}
              {renderThemeSwitch?.((t) => ({ ...t, className: cn('p-0', t?.className) }))}
              {renderSidebarTrigger?.((t) => ({
                children: <SidebarIcon />,
                ...t,
                className: cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                  }),
                  'p-2',
                  t?.className,
                ),
              }))}
            </div>
            {tabs.length > 0 && <SidebarTabsDropdown options={tabs} />}
            {banner}
          </div>
          {viewport}
          <div className="flex flex-col border-t p-4 pt-2 empty:hidden">{footer}</div>
        </SidebarDrawer>
      </>
    );
  }

  return (
    <TreeContextProvider tree={tree}>
      <LayoutContextProvider navTransparentMode={transparentMode}>
        <Sidebar defaultOpenLevel={defaultOpenLevel} prefetch={prefetch}>
          <LayoutBody _={Container}>
            {nav.enabled !== false &&
              (nav.component ?? (
                <LayoutHeader
                  id="nd-subnav"
                  className="[grid-area:header] sticky top-(--fd-docs-row-1) z-30 flex items-center ps-4 pe-2.5 border-b transition-colors backdrop-blur-sm h-(--fd-header-height) md:hidden max-md:layout:[--fd-header-height:--spacing(14)] data-[transparent=false]:bg-fd-background/80"
                >
                  {renderTitleNav(nav, {
                    className: 'inline-flex items-center gap-2.5 font-semibold',
                  })}
                  <div className="flex-1">{nav.children}</div>
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
                      'p-2',
                      t?.className,
                    ),
                  }))}
                </LayoutHeader>
              ))}
            {sidebarEnabled && sidebar()}
            {tabMode === 'top' && tabs.length > 0 && (
              <LayoutTabs
                options={tabs}
                className="z-10 bg-fd-background border-b px-6 pt-3 xl:px-8 max-md:hidden"
              />
            )}
            {children}
          </LayoutBody>
        </Sidebar>
      </LayoutContextProvider>
    </TreeContextProvider>
  );
}
