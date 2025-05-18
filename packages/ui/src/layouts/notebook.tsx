import { Fragment, type HTMLAttributes, useMemo } from 'react';
import { type BaseLayoutProps, getLinks, slot, slots } from '@/layouts/shared';
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarPageTree,
  SidebarViewport,
} from '@/components/layout/sidebar';
import { TreeContextProvider } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown, Languages, Sidebar as SidebarIcon } from 'lucide-react';
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
} from './notebook-client';
import {
  NavProvider,
  type PageStyles,
  StylesProvider,
} from '@/contexts/layout';
import { type Option, RootToggle } from '@/components/layout/root-toggle';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { HideIfEmpty } from '@/components/ui/hide-if-empty';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabMode?: 'sidebar' | 'navbar';

  nav?: BaseLayoutProps['nav'] & {
    mode?: 'top' | 'auto';
  };

  sidebar?: Partial<SidebarOptions>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout(props: DocsLayoutProps) {
  const {
    tabMode = 'sidebar',
    nav: { transparentMode, ...nav } = {},
    sidebar: {
      tabs: tabOptions,
      banner: sidebarBanner,
      footer: sidebarFooter,
      components: sidebarComponents,
      ...sidebar
    } = {},
    i18n = false,
    disableThemeSwitch = false,
    themeSwitch = { enabled: !disableThemeSwitch },
  } = props;

  const navMode = nav.mode ?? 'auto';
  const links = getLinks(props.links ?? [], props.githubUrl);
  const tabs = useMemo(
    () => getSidebarTabsFromOptions(tabOptions, props.tree) ?? [],
    [tabOptions, props.tree],
  );

  const variables = cn(
    '[--fd-nav-height:56px] [--fd-tocnav-height:36px] md:[--fd-sidebar-width:286px] md:[--fd-nav-height:64px] xl:[--fd-toc-width:286px] xl:[--fd-tocnav-height:0px]',
    tabs.length > 0 && tabMode === 'navbar' && 'lg:[--fd-nav-height:104px]',
  );

  const pageStyles: PageStyles = {
    tocNav: cn('xl:hidden'),
    toc: cn('max-xl:hidden'),
    page: cn('mt-(--fd-nav-height)'),
  };

  const sidebarHeader = (
    <div className="flex justify-between max-md:hidden">
      <Link
        href={nav.url ?? '/'}
        className="inline-flex items-center gap-2.5 font-medium"
      >
        {nav.title}
      </Link>
      {(sidebar.collapsible ?? true) && (
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
  );

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
          <Sidebar
            {...sidebar}
            className={cn(
              'md:w-[calc(var(--fd-sidebar-width)+var(--fd-layout-offset))] md:ps-(--fd-layout-offset)',
              navMode === 'top'
                ? 'md:bg-transparent'
                : 'md:[--fd-nav-height:0px]',
              sidebar.className,
            )}
          >
            <HideIfEmpty>
              <SidebarHeader>
                {navMode === 'auto' && sidebarHeader}
                {nav.children}
                {sidebarBanner}
                {tabMode === 'sidebar' && tabs.length > 0 ? (
                  <RootToggle className="mb-2" options={tabs} />
                ) : null}
                {tabMode === 'navbar' && tabs.length > 0 && (
                  <RootToggle options={tabs} className="lg:hidden" />
                )}
              </SidebarHeader>
            </HideIfEmpty>
            <SidebarViewport>
              {links
                .filter((item) => item.type !== 'icon')
                .map((item, i) => (
                  <SidebarLinkItem
                    key={i}
                    item={item}
                    className={cn(
                      'lg:hidden',
                      i === links.length - 1 && 'mb-4',
                    )}
                  />
                ))}

              <SidebarPageTree components={sidebarComponents} />
            </SidebarViewport>
            <HideIfEmpty>
              <SidebarFooter className="flex flex-row items-center justify-end">
                <div className="flex items-center flex-1 empty:hidden lg:hidden">
                  {links
                    .filter((item) => item.type === 'icon')
                    .map((item, i) => (
                      <BaseLinkItem
                        key={i}
                        item={item}
                        className={cn(
                          buttonVariants({
                            size: 'icon-sm',
                            color: 'ghost',
                            className: 'text-fd-muted-foreground',
                          }),
                        )}
                        aria-label={item.label}
                      >
                        {item.icon}
                      </BaseLinkItem>
                    ))}
                </div>
                {i18n ? (
                  <LanguageToggle className="me-auto md:hidden">
                    <Languages className="size-4.5 text-fd-muted-foreground" />
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
            </HideIfEmpty>
          </Sidebar>
          <DocsNavbar
            {...props}
            links={links}
            tabs={tabMode == 'navbar' ? tabs : []}
          />
          <StylesProvider {...pageStyles}>{props.children}</StylesProvider>
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

function DocsNavbar({
  links,
  tabs,
  ...props
}: DocsLayoutProps & {
  links: LinkItemType[];
  tabs: Option[];
}) {
  const navMode = props.nav?.mode ?? 'auto';
  const sidebarCollapsible = props.sidebar?.collapsible ?? true;
  const nav = (
    <Link
      href={props.nav?.url ?? '/'}
      className={cn(
        'inline-flex items-center gap-2.5 font-semibold empty:hidden',
        navMode === 'auto' && 'md:hidden',
      )}
    >
      {props.nav?.title}
    </Link>
  );

  return (
    <Navbar mode={navMode}>
      <div
        className={cn(
          'flex border-b px-4 flex-1',
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
          props.searchToggle,
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
          {props.nav?.children}
          {slots(
            'sm',
            props.searchToggle,
            <SearchToggle hideIfDisabled className="md:hidden" />,
          )}
          <NavbarSidebarTrigger className="-me-1.5 md:hidden" />
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
          {props.i18n ? (
            <LanguageToggle className="max-md:hidden">
              <Languages className="size-4.5 text-fd-muted-foreground" />
            </LanguageToggle>
          ) : null}
          {slot(
            props.themeSwitch,
            <ThemeToggle
              className="ms-2 max-md:hidden"
              mode={props.themeSwitch?.mode ?? 'light-dark-system'}
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
        <LayoutTabs className="px-6 border-b h-10 max-lg:hidden">
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
