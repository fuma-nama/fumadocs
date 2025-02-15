import { Fragment, type HTMLAttributes } from 'react';
import { type BaseLayoutProps, getLinks } from '@/layouts/shared';
import {
  CollapsibleSidebar,
  Sidebar,
  SidebarCollapseTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarViewport,
  SidebarPageTree,
} from '@/layouts/docs/sidebar';
import { TreeContextProvider } from '@/contexts/tree';
import { NavProvider, Title } from '@/components/layout/nav';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { cn } from '@/utils/cn';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { ChevronDown, Languages } from 'lucide-react';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  checkPageTree,
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
} from './notebook.client';
import { type PageStyles, StylesProvider } from '@/contexts/layout';
import { type Option, RootToggle } from '@/components/layout/root-toggle';

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
  ...props
}: DocsLayoutProps) {
  checkPageTree(props.tree);
  const navMode = nav.mode ?? 'auto';
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = sidebarCollapsible ? CollapsibleSidebar : Sidebar;

  const tabs = getSidebarTabsFromOptions(tabOptions, props.tree) ?? [];
  const variables = cn(
    '[--fd-nav-height:calc(var(--spacing)*14)] [--fd-tocnav-height:36px] md:[--fd-sidebar-width:286px] xl:[--fd-toc-width:286px] xl:[--fd-tocnav-height:0px]',
    tabs.length > 0 &&
      tabMode === 'navbar' &&
      'lg:[--fd-nav-height:calc(var(--spacing)*26)]',
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
              navMode === 'top'
                ? 'bg-transparent *:!pt-0'
                : 'md:[--fd-nav-height:0px]',
              sidebar.className,
            )}
          >
            <SidebarHeader>
              {nav.title && navMode === 'auto' ? (
                <Link
                  href={nav.url ?? '/'}
                  className="inline-flex items-center gap-2.5 py-1 font-medium max-md:hidden"
                >
                  {nav.title}
                </Link>
              ) : null}
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
            <SidebarFooter className={cn(!sidebarFooter && 'md:hidden')}>
              {!props.disableThemeSwitch ? (
                <ThemeToggle
                  className="w-fit md:hidden"
                  mode="light-dark-system"
                />
              ) : null}
              {sidebarFooter}
            </SidebarFooter>
          </Aside>
          <DocsNavbar
            nav={nav}
            links={links}
            i18n={i18n}
            sidebarCollapsible={sidebarCollapsible}
            tabs={tabMode == 'navbar' ? tabs : []}
          />
          <StylesProvider {...pageStyles}>{props.children}</StylesProvider>
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

function DocsNavbar({
  sidebarCollapsible,
  links,
  nav = {},
  i18n,
  tabs,
}: {
  nav: DocsLayoutProps['nav'];
  sidebarCollapsible: boolean;
  i18n: boolean;
  links: LinkItemType[];
  tabs: Option[];
}) {
  const navMode = nav.mode ?? 'auto';

  return (
    <Navbar
      className={cn('flex flex-col h-14', tabs.length > 0 && 'lg:h-26')}
      style={
        navMode === 'top'
          ? {
              paddingInlineStart: 'var(--fd-layout-offset)',
            }
          : undefined
      }
    >
      <div className="flex flex-row border-b border-fd-foreground/10 px-4 flex-1 md:px-6">
        <div
          className={cn(
            'flex flex-row items-center',
            navMode === 'top' && 'flex-1',
          )}
        >
          <Title
            url={nav.url}
            title={nav.title}
            className={cn(navMode === 'auto' ? 'md:hidden' : 'pe-6')}
          />
          {sidebarCollapsible ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon',
                }),
                'text-fd-muted-foreground data-[collapsed=false]:hidden max-md:hidden',
              )}
            />
          ) : null}
        </div>

        <LargeSearchToggle
          hideIfDisabled
          className={cn(
            'w-full my-auto rounded-xl max-md:hidden',
            navMode === 'top' ? 'max-w-sm px-2' : 'max-w-[240px]',
          )}
        />

        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
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
          {nav.children}
          <SearchToggle hideIfDisabled className="md:hidden" />
          <NavbarSidebarTrigger className="md:hidden" />
          {links
            .filter((item) => item.type === 'icon')
            .map((item, i) => (
              <BaseLinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({ size: 'icon', color: 'ghost' }),
                  'text-fd-muted-foreground [&_svg]:size-4.5 max-lg:hidden',
                )}
                aria-label={item.label}
              >
                {item.icon}
              </BaseLinkItem>
            ))}
          {i18n ? (
            <LanguageToggle>
              <Languages className="size-5" />
            </LanguageToggle>
          ) : null}
          <ThemeToggle className="max-md:hidden" mode="light-dark-system" />
        </div>
      </div>
      {tabs.length > 0 ? (
        <LayoutTabs className="px-6 border-b border-fd-foreground/10 max-lg:hidden">
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
