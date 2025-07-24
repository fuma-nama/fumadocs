import type { PageTree } from 'fumadocs-core/server';
import { type HTMLAttributes, type ReactNode, useMemo } from 'react';
import { Languages, Sidebar as SidebarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarPageTree,
  SidebarViewport,
} from '@/components/layout/sidebar';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import { RootToggle } from '@/components/layout/root-toggle';
import { type BaseLayoutProps, getLinks } from './shared';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import {
  CollapsibleControl,
  LayoutBody,
  Navbar,
  NavbarSidebarTrigger,
} from '@/layouts/docs-client';
import { TreeContextProvider } from '@/contexts/tree';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  getSidebarTabsFromOptions,
  SidebarLinkItem,
  type SidebarOptions,
} from '@/layouts/docs/shared';
import { NavProvider } from '@/contexts/layout';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { HideIfEmpty } from 'fumadocs-core/hide-if-empty';

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
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    tabs: sidebarTabs,
    footer: sidebarFooter,
    banner: sidebarBanner,
    enabled: sidebarEnabled = true,
    collapsible: sidebarCollapsible = true,
    component: sidebarComponent,
    components: sidebarComponents,
    ...sidebarProps
  } = {},
  searchToggle = {},
  disableThemeSwitch = false,
  themeSwitch = { enabled: !disableThemeSwitch },
  i18n = false,
  children,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(
    () => getSidebarTabsFromOptions(sidebarTabs, props.tree) ?? [],
    [sidebarTabs, props.tree],
  );
  const links = getLinks(props.links ?? [], props.githubUrl);

  const variables = cn(
    sidebarEnabled &&
      'md:[--fd-sidebar-width:268px] lg:[--fd-sidebar-width:286px]',
    'xl:[--fd-toc-width:286px]',
    !nav.component && nav.enabled !== false
      ? '[--fd-nav-height:56px] md:[--fd-nav-height:0px]'
      : undefined,
  );

  const sidebar = sidebarComponent ?? (
    <>
      {sidebarCollapsible && <CollapsibleControl />}
      <Sidebar {...sidebarProps} collapsible={sidebarCollapsible}>
        <HideIfEmpty>
          <SidebarHeader className="data-[empty=true]:hidden">
            <div className="flex max-md:hidden">
              <Link
                href={nav.url ?? '/'}
                className="inline-flex text-[15px] items-center gap-2.5 font-medium me-auto"
              >
                {nav.title}
              </Link>
              {nav.children}
              {sidebarCollapsible && (
                <SidebarCollapseTrigger
                  className={cn(
                    buttonVariants({
                      color: 'ghost',
                      size: 'icon-sm',
                      className:
                        'mb-auto text-fd-muted-foreground max-md:hidden',
                    }),
                  )}
                >
                  <SidebarIcon />
                </SidebarCollapseTrigger>
              )}
            </div>
            {searchToggle.enabled !== false &&
              (searchToggle.components?.lg ?? (
                <LargeSearchToggle hideIfDisabled className="max-md:hidden" />
              ))}
            {tabs.length > 0 && <RootToggle options={tabs} />}

            {sidebarBanner}
          </SidebarHeader>
        </HideIfEmpty>
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
          <SidebarPageTree components={sidebarComponents} />
        </SidebarViewport>
        <HideIfEmpty>
          <SidebarFooter className="data-[empty=true]:hidden">
            <div className="flex items-center justify-end empty:hidden">
              {links
                .filter((item) => item.type === 'icon')
                .map((item, i, arr) => (
                  <BaseLinkItem
                    key={i}
                    item={item}
                    className={cn(
                      buttonVariants({ size: 'icon', color: 'ghost' }),
                      'text-fd-muted-foreground md:[&_svg]:size-4.5',
                      i === arr.length - 1 && 'me-auto',
                    )}
                    aria-label={item.label}
                  >
                    {item.icon}
                  </BaseLinkItem>
                ))}
              {i18n ? (
                <LanguageToggle className="me-1.5">
                  <Languages className="size-4.5" />
                  <LanguageToggleText className="md:hidden" />
                </LanguageToggle>
              ) : null}
              {themeSwitch.enabled !== false &&
                (themeSwitch.component ?? (
                  <ThemeToggle className="p-0" mode={themeSwitch.mode} />
                ))}
            </div>
            {sidebarFooter}
          </SidebarFooter>
        </HideIfEmpty>
      </Sidebar>
    </>
  );

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {nav.enabled !== false &&
          (nav.component ?? (
            <Navbar className="h-14 md:hidden">
              <Link
                href={nav.url ?? '/'}
                className="inline-flex items-center gap-2.5 font-semibold"
              >
                {nav.title}
              </Link>
              <div className="flex-1">{nav.children}</div>
              {searchToggle?.enabled !== false &&
                (searchToggle.components?.sm ?? (
                  <SearchToggle className="p-2" hideIfDisabled />
                ))}
              {sidebarEnabled && (
                <NavbarSidebarTrigger className="p-2 -me-1.5 md:hidden" />
              )}
            </Navbar>
          ))}
        <LayoutBody
          {...props.containerProps}
          className={cn(variables, props.containerProps?.className)}
        >
          {sidebarEnabled && sidebar}
          {children}
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

export { CollapsibleControl, Navbar, NavbarSidebarTrigger, type LinkItemType };
