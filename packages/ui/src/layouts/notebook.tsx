import { Fragment, type HTMLAttributes, type ReactNode } from 'react';
import {
  type BaseLayoutProps,
  getLinks,
  type SharedNavProps,
} from '@/layouts/shared';
import {
  CollapsibleSidebar,
  Sidebar,
  SidebarCollapseTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarViewport,
  SidebarPageTree,
} from '@/layouts/docs/sidebar';
import { notFound } from 'next/navigation';
import { RootToggle } from '@/components/layout/root-toggle';
import { TreeContextProvider } from '@/contexts/tree';
import { NavProvider, Title } from '@/components/layout/nav';
import { Navbar, NavbarSidebarTrigger } from '@/layouts/docs/navbar';
import { SearchOnly } from '@/contexts/search';
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
  getSidebarTabsFromOptions,
  SidebarLinkItem,
  type SidebarOptions,
} from '@/layouts/docs/shared';
import type { PageTree } from 'fumadocs-core/server';
import { LayoutBody } from './notebook.client';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Omit<Partial<SidebarOptions>, 'component' | 'enabled'>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout({
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
}: DocsLayoutProps): ReactNode {
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = sidebarCollapsible ? CollapsibleSidebar : Sidebar;
  if (props.tree === undefined) notFound();

  const tabs = getSidebarTabsFromOptions(tabOptions, props.tree) ?? [];

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        <LayoutBody
          {...props.containerProps}
          className={cn(
            '[--fd-nav-height:3.5rem] md:[--fd-sidebar-width:260px] xl:[--fd-toc-width:260px]',
            props.containerProps?.className,
          )}
        >
          <Aside
            {...sidebar}
            className={cn('md:[--fd-nav-height:0px]', sidebar.className)}
          >
            <SidebarHeader>
              <SidebarHeaderItems nav={nav} links={links}>
                {nav.children}
                {sidebarCollapsible ? (
                  <SidebarCollapseTrigger className="ms-auto text-fd-muted-foreground" />
                ) : null}
              </SidebarHeaderItems>
              {sidebarBanner}
              {tabs.length > 0 ? (
                <RootToggle options={tabs} className="md:-mx-2" />
              ) : null}
            </SidebarHeader>
            <SidebarViewport>
              <div className="px-4 pt-4 empty:hidden md:px-3 lg:hidden">
                {links.map((item, i) => (
                  <SidebarLinkItem key={i} item={item} />
                ))}
              </div>
              <div className="p-4 md:px-3">
                <SidebarPageTree components={sidebarComponents} />
              </div>
            </SidebarViewport>
            <SidebarFooter>{sidebarFooter}</SidebarFooter>
          </Aside>
          <div className="w-full min-w-0 max-w-[var(--fd-content-width)] [--fd-nav-height:3.5rem]">
            <DocsNavbar
              nav={nav}
              links={links}
              i18n={i18n}
              sidebarCollapsible={sidebarCollapsible}
            />
            <div className="flex flex-row">{props.children}</div>
          </div>
          <div
            className="min-w-[var(--fd-sidebar-width)] flex-1"
            style={{
              marginInlineStart: 'calc(var(--fd-sidebar-width) * -1)',
            }}
          />
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

function DocsNavbar({
  sidebarCollapsible,
  links,
  nav = {},
  i18n,
}: {
  nav: DocsLayoutProps['nav'];
  sidebarCollapsible: boolean;
  i18n: boolean;
  links: LinkItemType[];
}) {
  return (
    <Navbar className="h-14">
      {sidebarCollapsible ? (
        <SidebarCollapseTrigger className="me-2 data-[collapsed=false]:hidden max-md:hidden" />
      ) : null}
      <SearchOnly>
        <LargeSearchToggle className="w-full max-w-[240px] rounded-lg max-md:hidden" />
      </SearchOnly>
      <Title url={nav.url} title={nav.title} className="md:hidden" />
      <div className="ms-4 flex flex-1 flex-row items-center gap-6">
        {links
          .filter((item) => item.type !== 'icon')
          .map((item, i) => (
            <NavbarLinkItem
              key={i}
              item={item}
              className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground max-lg:hidden"
            />
          ))}
        {nav.children}
      </div>
      <SearchOnly>
        <SearchToggle className="md:hidden" />
      </SearchOnly>
      <NavbarSidebarTrigger className="-me-2 md:hidden" />
      {links
        .filter((item) => item.type === 'icon')
        .map((item, i) => (
          <BaseLinkItem
            key={i}
            item={item}
            className={cn(
              buttonVariants({ size: 'icon', color: 'ghost' }),
              'text-fd-muted-foreground max-lg:hidden',
            )}
            aria-label={item.label}
          >
            {item.icon}
          </BaseLinkItem>
        ))}
      {i18n ? (
        <LanguageToggle className="me-1.5">
          <Languages className="size-5" />
        </LanguageToggle>
      ) : null}
      <ThemeToggle className="max-md:hidden" />
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

function SidebarHeaderItems({
  links,
  nav = {},
  children,
}: SharedNavProps & {
  nav: DocsLayoutProps['nav'];
  links: LinkItemType[];
  children: ReactNode;
}) {
  const isEmpty = !nav.title && !nav.children && links.length === 0;
  if (isEmpty) return null;

  return (
    <div className="flex flex-row items-center max-md:hidden">
      {nav.title ? (
        <Link
          href={nav.url ?? '/'}
          className="inline-flex items-center gap-2.5 py-1 font-medium"
        >
          {nav.title}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
