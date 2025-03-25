import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, type HTMLAttributes } from 'react';
import { Languages, SidebarIcon } from 'lucide-react';
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
} from '@/components/layout/sidebar';
import { replaceOrDefault } from '@/layouts/shared';
import {
  type LinkItemType,
  BaseLinkItem,
  type IconItemType,
} from '@/layouts/links';
import { RootToggle } from '@/components/layout/root-toggle';
import { type BaseLayoutProps, getLinks } from './shared';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import {
  CollapsibleControl,
  Navbar,
  NavbarSidebarTrigger,
} from '@/layouts/docs.client';
import { TreeContextProvider } from '@/contexts/tree';
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
import {
  type PageStyles,
  StylesProvider,
  NavProvider,
} from '@/contexts/layout';
import Link from 'fumadocs-core/link';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions> & {
    enabled?: boolean;
    component?: ReactNode;
  };

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout({
  nav: {
    enabled: navEnabled = true,
    component: navReplace,
    transparentMode,
    ...nav
  } = {},
  themeSwitch,
  sidebar = {},
  i18n = false,
  children,
  ...props
}: DocsLayoutProps): ReactNode {
  checkPageTree(props.tree);
  const links = getLinks(props.links ?? [], props.githubUrl);

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
            <Link
              href={nav.url ?? '/'}
              className="inline-flex items-center gap-2.5 font-semibold"
            >
              {nav.title}
            </Link>
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
          {replaceOrDefault(
            sidebar,
            <DocsLayoutSidebar
              tree={props.tree}
              {...sidebar}
              links={links}
              nav={
                <>
                  <Link
                    href={nav.url ?? '/'}
                    className="inline-flex text-[15px] items-center gap-2.5 font-medium"
                  >
                    {nav.title}
                  </Link>
                  {nav.children}
                </>
              }
              footer={
                <>
                  <DocsLayoutSidebarFooter
                    links={links.filter((item) => item.type === 'icon')}
                    i18n={i18n}
                    themeSwitch={themeSwitch}
                  />
                  {sidebar.footer}
                </>
              }
            />,
          )}
          <StylesProvider {...pageStyles}>{children}</StylesProvider>
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

export function DocsLayoutSidebar({
  collapsible = true,
  components,
  tabs: tabOptions,
  hideSearch,
  tree,
  nav,
  links = [],
  footer,
  banner,
  ...props
}: Partial<SidebarOptions> & {
  tree: PageTree.Root;
  links?: LinkItemType[];
  nav?: ReactNode;
}) {
  const tabs = getSidebarTabsFromOptions(tabOptions, tree) ?? [];
  const Aside = collapsible ? CollapsibleSidebar : Sidebar;

  return (
    <>
      {collapsible ? <CollapsibleControl /> : null}
      <Aside
        {...props}
        className={cn('md:ps-(--fd-layout-offset)', props.className)}
      >
        <SidebarHeader>
          <div className="flex flex-row pt-1 max-md:hidden">
            {nav}
            {collapsible && (
              <SidebarCollapseTrigger
                className={cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                  }),
                  'ms-auto mb-auto text-fd-muted-foreground max-md:hidden',
                )}
              >
                <SidebarIcon />
              </SidebarCollapseTrigger>
            )}
          </div>
          {banner}
          {tabs.length > 0 ? (
            <RootToggle options={tabs} className="-mx-2" />
          ) : null}
          {!hideSearch ? (
            <LargeSearchToggle
              hideIfDisabled
              className="rounded-lg max-md:hidden"
            />
          ) : null}
        </SidebarHeader>
        <SidebarViewport>
          <div className="mb-4 empty:hidden">
            {links
              .filter((v) => v.type !== 'icon')
              .map((item, i) => (
                <SidebarLinkItem key={i} item={item} />
              ))}
          </div>
          <SidebarPageTree components={components} />
        </SidebarViewport>
        <SidebarFooter>{footer}</SidebarFooter>
      </Aside>
    </>
  );
}

export function DocsLayoutSidebarFooter({
  i18n,
  themeSwitch,
  links = [],
}: {
  i18n?: DocsLayoutProps['i18n'];
  links?: IconItemType[];
  themeSwitch?: DocsLayoutProps['themeSwitch'];
}) {
  // empty footer items
  if (links.length === 0 && !i18n && themeSwitch?.enabled === false)
    return null;

  return (
    <div className="flex flex-row items-center">
      {links.map((item, i) => (
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
      {replaceOrDefault(
        themeSwitch,
        <ThemeToggle className="p-0" mode={themeSwitch?.mode} />,
      )}
    </div>
  );
}

export { CollapsibleControl, Navbar, NavbarSidebarTrigger, type LinkItemType };
export { getSidebarTabsFromOptions, type TabOptions } from './docs/shared';
