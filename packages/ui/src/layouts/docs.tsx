import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, type HTMLAttributes } from 'react';
import Link from 'next/link';
import { ChevronRight, Languages } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  CollapsibleSidebar,
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarCollapseTrigger,
  SidebarViewport,
  SidebarPageTree,
} from '@/layouts/docs/sidebar';
import { replaceOrDefault } from '@/layouts/shared';
import { type LinkItemType, BaseLinkItem } from '@/layouts/links';
import { RootToggle } from '@/components/layout/root-toggle';
import { type BaseLayoutProps, getLinks } from './shared';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import { Navbar, NavbarSidebarTrigger } from '@/layouts/docs.client';
import { TreeContextProvider } from '@/contexts/tree';
import { NavProvider, Title } from '@/components/layout/nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import {
  checkPageTree,
  getSidebarTabsFromOptions,
  layoutVariables,
  SidebarLinkItem,
  type SidebarOptions,
} from '@/layouts/docs/shared';
import { type PageStyles, StylesProvider } from '@/contexts/layout';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout({
  nav: {
    enabled: navEnabled = true,
    component: navReplace,
    transparentMode,
    ...nav
  } = {},
  sidebar: {
    enabled: sidebarEnabled = true,
    collapsible = true,
    component: sidebarReplace,
    tabs: tabOptions,
    banner: sidebarBanner,
    footer: sidebarFooter,
    components: sidebarComponents,
    hideSearch: sidebarHideSearch,
    ...sidebar
  } = {},
  i18n = false,
  ...props
}: DocsLayoutProps): ReactNode {
  checkPageTree(props.tree);
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = collapsible ? CollapsibleSidebar : Sidebar;

  const tabs = getSidebarTabsFromOptions(tabOptions, props.tree) ?? [];
  const variables = cn(
    '[--fd-tocnav-height:36px] md:[--fd-sidebar-width:268px] lg:[--fd-sidebar-width:286px] xl:[--fd-toc-width:286px] xl:[--fd-tocnav-height:0px]',
    !navReplace && navEnabled
      ? '[--fd-nav-height:calc(var(--spacing)*14)] md:[--fd-nav-height:0px]'
      : undefined,
  );

  const pageStyles: PageStyles = {
    tocNav: cn('xl:hidden'),
    toc: cn('max-xl:hidden'),
  };

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {replaceOrDefault(
          { enabled: navEnabled, component: navReplace },
          <Navbar className="md:hidden">
            <Title url={nav.url} title={nav.title} />
            <div className="flex flex-1 flex-row items-center gap-1">
              {nav.children}
            </div>
            <SearchToggle hideIfDisabled />
            <NavbarSidebarTrigger className="-me-2 md:hidden" />
          </Navbar>,
          nav,
        )}
        <main
          id="nd-docs-layout"
          {...props.containerProps}
          className={cn(
            'flex flex-1 flex-row pe-(--fd-layout-offset)',
            variables,
            props.containerProps?.className,
          )}
          style={{
            ...layoutVariables,
            ...props.containerProps?.style,
          }}
        >
          {collapsible ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'icon',
                }),
                'fixed top-1/2 -translate-y-1/2 start-0 z-40 text-fd-muted-foreground border-s-0 rounded-s-none shadow-md data-[collapsed=false]:hidden max-md:hidden',
              )}
            >
              <ChevronRight />
            </SidebarCollapseTrigger>
          ) : null}
          {replaceOrDefault(
            { enabled: sidebarEnabled, component: sidebarReplace },
            <Aside
              {...sidebar}
              className={cn('md:ps-(--fd-layout-offset)', sidebar.className)}
            >
              <SidebarHeader>
                <div className="flex flex-row pt-1 max-md:hidden">
                  <Link
                    href={nav.url ?? '/'}
                    className="inline-flex text-[15px] items-center gap-2.5 font-medium"
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
                        }),
                        'ms-auto mb-auto text-fd-muted-foreground max-md:hidden',
                      )}
                    />
                  )}
                </div>
                {sidebarBanner}
                {tabs.length > 0 ? (
                  <RootToggle options={tabs} className="-mx-2" />
                ) : null}
                {!sidebarHideSearch ? (
                  <LargeSearchToggle
                    hideIfDisabled
                    className="rounded-lg max-md:hidden"
                  />
                ) : null}
              </SidebarHeader>
              <SidebarViewport>
                <div className="mb-4 empty:hidden md:hidden">
                  {links
                    .filter((v) => v.type !== 'icon')
                    .map((item, i) => (
                      <SidebarLinkItem key={i} item={item} />
                    ))}
                </div>
                <SidebarPageTree components={sidebarComponents} />
              </SidebarViewport>
              <SidebarFooter>
                <SidebarFooterItems
                  links={links}
                  i18n={i18n}
                  disableThemeSwitch={props.disableThemeSwitch ?? false}
                />
                {sidebarFooter}
              </SidebarFooter>
            </Aside>,
            {
              ...sidebar,
              tabs,
            },
          )}
          <StylesProvider {...pageStyles}>{props.children}</StylesProvider>
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

function SidebarFooterItems({
  i18n,
  disableThemeSwitch,
  links,
}: {
  i18n: boolean;
  links: LinkItemType[];
  disableThemeSwitch: boolean;
}) {
  const iconItems = links.filter((v) => v.type === 'icon');

  // empty footer items
  if (links.length === 0 && !i18n && disableThemeSwitch) return null;

  return (
    <div className="flex flex-row items-center">
      {iconItems.map((item, i) => (
        <BaseLinkItem
          key={i}
          item={item}
          className={cn(
            buttonVariants({ size: 'icon', color: 'ghost' }),
            'text-fd-muted-foreground md:[&_svg]:size-4.5',
          )}
          aria-label={item.label}
        >
          {item.icon}
        </BaseLinkItem>
      ))}
      <div role="separator" className="flex-1" />
      {i18n ? (
        <LanguageToggle className="me-1.5">
          <Languages className="size-4.5" />
          <LanguageToggleText className="md:hidden" />
        </LanguageToggle>
      ) : null}
      {!disableThemeSwitch ? <ThemeToggle className="p-0" /> : null}
    </div>
  );
}

export { getSidebarTabsFromOptions, type TabOptions } from './docs/shared';
export { type LinkItemType };
