import { Fragment, type HTMLAttributes, type ReactNode, useMemo } from 'react';
import { type BaseLayoutProps, getLinks, slot, slots } from '@/layouts/shared';
import {
  CollapsibleSidebar,
  Sidebar,
  SidebarCollapseTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarViewport,
  SidebarPageTree,
} from '@/components/layout/sidebar';
import { TreeContextProvider } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown, Languages, SidebarIcon } from 'lucide-react';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getSidebarTabsFromOptions,
  layoutVariables,
  SidebarLinkItem,
  type SidebarOptions,
} from '@/layouts/docs/shared';
import type { PageTree } from 'fumadocs-core/server';
import {
  LayoutTab,
  LayoutTabs,
  Navbar,
  NavbarSidebarTrigger,
  SidebarLayoutTab,
} from './notebook-client';
import {
  type PageStyles,
  StylesProvider,
  NavProvider,
} from '@/contexts/layout';
import { type Option, RootToggle } from '@/components/layout/root-toggle';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabMode?: 'sidebar' | 'navbar';

  nav?: BaseLayoutProps['nav'] & {
    mode?: 'top' | 'auto';
  };

  sidebar?: Omit<Partial<SidebarOptions>, 'component' | 'enabled'>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout({
  tabMode = 'sidebar',
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    collapsible: sidebarCollapsible = true,
    tabs: tabOptions,
    banner: sidebarBanner,
    footer: sidebarFooter,
    components: sidebarComponents,
    ...sidebar
  } = {},
  i18n = false,
  disableThemeSwitch = false,
  themeSwitch = { enabled: !disableThemeSwitch },
  searchToggle,
  ...props
}: DocsLayoutProps) {
  const navMode = nav.mode ?? 'auto';
  const links = getLinks(props.links ?? [], props.githubUrl);
  const tabs = useMemo(
    () => getSidebarTabsFromOptions(tabOptions, props.tree) ?? [],
    [tabOptions, props.tree],
  );

  const Aside = sidebarCollapsible ? CollapsibleSidebar : Sidebar;

  const variables = cn(
    '[--fd-nav-height:calc(var(--spacing)*14)] [--fd-tocnav-height:36px] md:[--fd-sidebar-width:286px] xl:[--fd-toc-width:286px] xl:[--fd-tocnav-height:0px]',
    tabs.length > 0 &&
      tabMode === 'navbar' &&
      'lg:[--fd-nav-height:calc(var(--spacing)*24)]',
  );

  const pageStyles: PageStyles = {
    tocNav: cn('xl:hidden'),
    toc: cn('max-xl:hidden'),
    page: cn('mt-(--fd-nav-height)'),
  };

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        <main
          id="nd-docs-layout"
          {...props.containerProps}
          className={cn(
            'flex w-full flex-1 flex-row pe-(--fd-layout-offset)',
            variables,
            props.containerProps?.className,
          )}
          style={{
            ...layoutVariables,
            ...props.containerProps?.style,
          }}
        >
          <Aside
            {...sidebar}
            className={cn(
              'md:ps-(--fd-layout-offset)',
              navMode === 'top' ? 'bg-transparent' : 'md:[--fd-nav-height:0px]',
              sidebar.className,
            )}
            inner={{
              className: cn(
                navMode === 'top' ? 'md:pt-2.5' : 'md:pt-3.5',
                tabMode === 'navbar' && 'md:pt-0',
              ),
            }}
          >
            <SidebarHeader>
              {navMode === 'auto' && (
                <div className="flex flex-row justify-between max-md:hidden">
                  <Link
                    href={nav.url ?? '/'}
                    className="inline-flex items-center gap-2.5 font-medium"
                  >
                    {nav.title}
                  </Link>
                  <SidebarCollapseTrigger
                    className={cn(
                      buttonVariants({
                        color: 'ghost',
                        size: 'icon-sm',
                      }),
                      'text-fd-muted-foreground mb-auto',
                    )}
                  >
                    <SidebarIcon />
                  </SidebarCollapseTrigger>
                </div>
              )}
              {nav.children}
              {sidebarBanner}
              {tabMode === 'sidebar' && tabs.length > 0 ? (
                <RootToggle options={tabs} className="-mx-2" />
              ) : null}
            </SidebarHeader>
            <SidebarViewport>
              {tabMode === 'navbar' &&
                tabs.map((tab, i) => (
                  <SidebarLayoutTab
                    key={tab.url}
                    item={tab}
                    className={cn('lg:hidden', i === tabs.length - 1 && 'mb-4')}
                  />
                ))}
              {links.map((item, i) => (
                <SidebarLinkItem
                  key={i}
                  item={item}
                  className={cn('lg:hidden', i === links.length - 1 && 'mb-4')}
                />
              ))}

              <SidebarPageTree components={sidebarComponents} />
            </SidebarViewport>
            <SidebarFooter
              className={cn(
                'flex flex-row items-center',
                !sidebarFooter && 'md:hidden',
              )}
            >
              {i18n ? (
                <LanguageToggle className="me-auto md:hidden">
                  <Languages className="size-5 text-fd-muted-foreground" />
                </LanguageToggle>
              ) : null}
              {slot(
                themeSwitch,
                <ThemeToggle
                  className="md:hidden"
                  mode={themeSwitch?.mode ?? 'light-dark-system'}
                />,
              )}
              {sidebarFooter}
            </SidebarFooter>
          </Aside>
          <DocsNavbar
            mode={nav.mode}
            nav={
              <Link
                href={nav.url ?? '/'}
                className={cn(
                  'inline-flex items-center gap-2.5 font-semibold',
                  navMode === 'auto' && 'md:hidden',
                )}
              >
                {nav.title}
              </Link>
            }
            links={links}
            i18n={i18n}
            sidebarCollapsible={sidebarCollapsible}
            searchToggle={searchToggle}
            tabs={tabMode == 'navbar' ? tabs : []}
          >
            {nav.children}
          </DocsNavbar>
          <StylesProvider {...pageStyles}>{props.children}</StylesProvider>
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

function DocsNavbar({
  mode: navMode = 'auto',
  nav,
  sidebarCollapsible = false,
  links,
  themeSwitch,
  searchToggle,
  i18n = false,
  tabs,
  children,
}: {
  mode?: 'top' | 'auto';
  nav?: ReactNode;
  sidebarCollapsible?: boolean;

  i18n?: DocsLayoutProps['i18n'];
  themeSwitch?: DocsLayoutProps['themeSwitch'];
  searchToggle?: DocsLayoutProps['searchToggle'];

  links: LinkItemType[];
  tabs: Option[];
  children?: ReactNode;
}) {
  return (
    <Navbar mode={navMode}>
      <div
        className={cn(
          'flex flex-row border-b border-fd-foreground/10 px-4 h-14',
          navMode === 'auto' && 'md:px-6',
        )}
      >
        <div
          className={cn(
            'flex flex-row items-center',
            navMode === 'top' && 'flex-1 pe-4',
          )}
        >
          {sidebarCollapsible && navMode === 'auto' ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon-sm',
                }),
                'text-fd-muted-foreground -ms-1.5 me-2 data-[collapsed=false]:hidden max-md:hidden',
              )}
            >
              <SidebarIcon />
            </SidebarCollapseTrigger>
          ) : null}
          {nav}
        </div>
        {slots(
          'lg',
          searchToggle,
          <LargeSearchToggle
            hideIfDisabled
            className={cn(
              'w-full my-auto rounded-xl max-md:hidden',
              navMode === 'top' ? 'max-w-sm px-2' : 'max-w-[240px]',
            )}
          />,
        )}
        <div className="flex flex-1 flex-row items-center justify-end">
          <div className="flex flex-row items-center gap-6 px-4 empty:hidden max-lg:hidden">
            {links
              .filter((item) => item.type !== 'icon')
              .map((item, i) => (
                <NavbarLinkItem
                  key={i}
                  item={item}
                  className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground"
                />
              ))}
          </div>
          {children}
          {slots(
            'sm',
            searchToggle,
            <SearchToggle hideIfDisabled className="md:hidden" />,
          )}
          <NavbarSidebarTrigger className="md:hidden" />
          {links
            .filter((item) => item.type === 'icon')
            .map((item, i) => (
              <BaseLinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                  'text-fd-muted-foreground max-lg:hidden',
                )}
                aria-label={item.label}
              >
                {item.icon}
              </BaseLinkItem>
            ))}
          {i18n ? (
            <LanguageToggle className="max-md:hidden">
              <Languages className="size-4.5 text-fd-muted-foreground" />
            </LanguageToggle>
          ) : null}
          {slot(
            themeSwitch,
            <ThemeToggle
              className="ms-2 max-md:hidden"
              mode={themeSwitch?.mode ?? 'light-dark-system'}
            />,
          )}
          {sidebarCollapsible && navMode === 'top' ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'icon-sm',
                }),
                'ms-2 text-fd-muted-foreground rounded-full max-md:hidden',
              )}
            >
              <SidebarIcon />
            </SidebarCollapseTrigger>
          ) : null}
        </div>
      </div>
      {tabs.length > 0 ? (
        <LayoutTabs className="px-6 border-b border-fd-foreground/10 h-10 max-lg:hidden">
          {tabs.map((tab) => (
            <LayoutTab key={tab.url} {...tab} />
          ))}
        </LayoutTabs>
      ) : null}
    </Navbar>
  );
}

function NavbarLinkItem({
  item,
  ...props
}: { item: LinkItemType } & HTMLAttributes<HTMLElement>) {
  if (item.type === 'menu') {
    return (
      <Popover>
        <PopoverTrigger
          {...props}
          className={cn('inline-flex items-center gap-1.5', props.className)}
        >
          {item.text}
          <ChevronDown className="size-3" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          {item.items.map((child, i) => {
            if (child.type === 'custom')
              return <Fragment key={i}>{child.children}</Fragment>;

            return (
              <BaseLinkItem
                key={i}
                item={child}
                className="inline-flex items-center gap-2 rounded-md p-2 text-start hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4"
              >
                {child.icon}
                {child.text}
              </BaseLinkItem>
            );
          })}
        </PopoverContent>
      </Popover>
    );
  }

  if (item.type === 'custom') return item.children;

  return (
    <BaseLinkItem item={item} {...props}>
      {item.text}
    </BaseLinkItem>
  );
}

export { Navbar, NavbarSidebarTrigger };
