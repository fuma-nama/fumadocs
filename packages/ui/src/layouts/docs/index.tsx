import type * as PageTree from 'fumadocs-core/page-tree';
import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
} from 'react';
import { Languages, Sidebar as SidebarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  Sidebar,
  SidebarCollapseTrigger,
  type SidebarComponents,
  SidebarContent,
  SidebarContentMobile,
  SidebarFooter,
  SidebarHeader,
  SidebarLinkItem,
  SidebarPageTree,
  type SidebarProps,
  SidebarTrigger,
  SidebarViewport,
} from './sidebar';
import { type Option, RootToggle } from '@/layouts/shared/root-toggle';
import { type BaseLayoutProps, resolveLinkItems } from '@/layouts/shared';
import { LinkItem } from '@/layouts/shared/link-item';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/layouts/shared/language-toggle';
import {
  CollapsibleControl,
  LayoutTabs,
  LayoutHeader,
  LayoutBody,
} from './client';
import { TreeContextProvider } from '@/contexts/tree';
import { ThemeToggle } from '../shared/theme-toggle';
import { NavProvider } from '@/contexts/layout';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/layouts/shared/search-toggle';
import {
  getSidebarTabs,
  type GetSidebarTabsOptions,
} from '@/utils/get-sidebar-tabs';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: SidebarOptions;

  tabMode?: 'top' | 'auto';

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

interface SidebarOptions
  extends ComponentProps<'aside'>,
    Pick<SidebarProps, 'defaultOpenLevel' | 'prefetch'> {
  enabled?: boolean;
  component?: ReactNode;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export function DocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    tabs: sidebarTabs,
    enabled: sidebarEnabled = true,
    ...sidebarProps
  } = {},
  searchToggle = {},
  themeSwitch = {},
  tabMode = 'auto',
  i18n = false,
  children,
  tree,
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
  const links = resolveLinkItems(props);

  function sidebar() {
    const {
      footer,
      banner,
      collapsible = true,
      component,
      components,
      defaultOpenLevel,
      prefetch,
      ...rest
    } = sidebarProps;
    if (component) return component;

    const iconLinks = links.filter((item) => item.type === 'icon');

    const viewport = (
      <SidebarViewport>
        {links
          .filter((v) => v.type !== 'icon')
          .map((item, i, list) => (
            <SidebarLinkItem
              key={i}
              item={item}
              className={cn(i === list.length - 1 && 'mb-4')}
            />
          ))}
        <SidebarPageTree components={components} />
      </SidebarViewport>
    );

    const mobile = (
      <SidebarContentMobile {...rest}>
        <SidebarHeader>
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
            {i18n && (
              <LanguageToggle>
                <Languages className="size-4.5" />
                <LanguageToggleText />
              </LanguageToggle>
            )}
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? (
                <ThemeToggle className="p-0" mode={themeSwitch.mode} />
              ))}
            <SidebarTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon-sm',
                  className: 'p-2',
                }),
              )}
            >
              <SidebarIcon />
            </SidebarTrigger>
          </div>
          {tabs.length > 0 && <RootToggle options={tabs} />}
          {banner}
        </SidebarHeader>
        {viewport}
        <SidebarFooter className="empty:hidden">{footer}</SidebarFooter>
      </SidebarContentMobile>
    );

    const content = (
      <SidebarContent {...rest}>
        <SidebarHeader>
          <div className="flex">
            <Link
              href={nav.url ?? '/'}
              className="inline-flex text-[0.9375rem] items-center gap-2.5 font-medium me-auto"
            >
              {nav.title}
            </Link>
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
          {searchToggle.enabled !== false &&
            (searchToggle.components?.lg ?? (
              <LargeSearchToggle hideIfDisabled />
            ))}
          {tabs.length > 0 && tabMode === 'auto' && (
            <RootToggle options={tabs} />
          )}
          {banner}
        </SidebarHeader>
        {viewport}
        {(i18n ||
          iconLinks.length > 0 ||
          themeSwitch?.enabled !== false ||
          footer) && (
          <SidebarFooter>
            <div className="flex text-fd-muted-foreground items-center empty:hidden">
              {i18n && (
                <LanguageToggle>
                  <Languages className="size-4.5" />
                </LanguageToggle>
              )}
              {iconLinks.map((item, i) => (
                <LinkItem
                  key={i}
                  item={item}
                  className={cn(
                    buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                  )}
                  aria-label={item.label}
                >
                  {item.icon}
                </LinkItem>
              ))}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle
                    className="ms-auto p-0"
                    mode={themeSwitch.mode}
                  />
                ))}
            </div>
            {footer}
          </SidebarFooter>
        )}
      </SidebarContent>
    );

    return (
      <Sidebar
        defaultOpenLevel={defaultOpenLevel}
        prefetch={prefetch}
        Mobile={mobile}
        Content={
          <>
            {collapsible && <CollapsibleControl />}
            {content}
          </>
        }
      />
    );
  }

  return (
    <TreeContextProvider tree={tree}>
      <NavProvider transparentMode={transparentMode}>
        <LayoutBody {...props.containerProps}>
          {nav.enabled !== false &&
            (nav.component ?? (
              <LayoutHeader
                id="nd-subnav"
                className="[grid-area:header] sticky top-(--fd-docs-nav-top) z-30 flex items-center ps-4 pe-2.5 border-b transition-colors backdrop-blur-sm h-14 md:hidden data-[transparent=false]:bg-fd-background/80"
              >
                <Link
                  href={nav.url ?? '/'}
                  className="inline-flex items-center gap-2.5 font-semibold"
                >
                  {nav.title}
                </Link>
                <div className="flex-1">{nav.children}</div>
                {searchToggle.enabled !== false &&
                  (searchToggle.components?.sm ?? (
                    <SearchToggle className="p-2" hideIfDisabled />
                  ))}
                {sidebarEnabled && (
                  <SidebarTrigger
                    className={cn(
                      buttonVariants({
                        color: 'ghost',
                        size: 'icon-sm',
                        className: 'p-2',
                      }),
                    )}
                  >
                    <SidebarIcon />
                  </SidebarTrigger>
                )}
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
      </NavProvider>
    </TreeContextProvider>
  );
}
