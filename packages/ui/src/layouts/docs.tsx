import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, type HTMLAttributes, Fragment } from 'react';
import Link from 'next/link';
import { Languages, MoreHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { SidebarProps } from '@/components/layout/sidebar';
import { replaceOrDefault } from '@/layouts/shared';
import type { LinkItemType } from '@/layouts/links';
import { getSidebarTabs, type TabOptions } from '@/utils/get-sidebar-tabs';
import type { Option } from '@/components/layout/root-toggle';
import { type BaseLayoutProps, getLinks } from './shared';

declare const {
  TreeContextProvider,
  SidebarCollapseTrigger,
  ThemeToggle,
  SubNav,
  LanguageToggle,
  LanguageToggleText,
  LinksMenu,
  RootToggle,
  Sidebar,
  IconItem,
  MenuItem,
  NavProvider,
}: typeof import('./docs.client');

const DynamicSidebar = dynamic(
  () => import('@/components/layout/dynamic-sidebar'),
);

export type { LinkItemType };

interface SidebarOptions extends Omit<SidebarProps, 'children'> {
  enabled: boolean;
  component: ReactNode;
  collapsible: boolean;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | TabOptions | false;
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    enabled: sidebarEnabled = true,
    collapsible = true,
    component: sidebarReplace,
    tabs: tabOptions,
    ...sidebar
  } = {},
  i18n = false,
  ...props
}: DocsLayoutProps): ReactNode {
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = collapsible ? DynamicSidebar : Sidebar;

  if (props.tree === undefined) notFound();

  const header: ReactNode[] = [];
  const footer: ReactNode[] = [];

  if (nav.title)
    header.push(
      <Link
        key="title"
        href={nav.url ?? '/'}
        className="inline-flex items-center gap-2.5 py-1 font-medium"
      >
        {nav.title}
      </Link>,
    );

  if (nav.children)
    header.push(<Fragment key="children">{nav.children}</Fragment>);

  if (links.length > 0)
    header.push(
      <LinksMenu
        key="links"
        items={links.map((item, i) => (
          <MenuItem key={i} item={item} />
        ))}
        className={cn(
          buttonVariants({
            size: 'icon',
            color: 'ghost',
            className: 'ms-auto',
          }),
        )}
      >
        <MoreHorizontal />
      </LinksMenu>,
    );

  const iconLinks = links.filter((v) => v.type === 'icon');
  if (iconLinks.length > 0) {
    footer.push(
      <div key="links" className="flex flex-row items-center md:hidden">
        {iconLinks.map((item, i) => (
          <IconItem key={i} item={item} className="text-fd-muted-foreground" />
        ))}
      </div>,
    );
  }

  if (!props.disableThemeSwitch) {
    footer.push(
      <ThemeToggle
        key="theme"
        className={cn('md:me-auto', !i18n && 'max-md:ms-auto')}
      />,
    );
  }

  if (i18n) {
    footer.push(
      <LanguageToggle key="i18n" className="max-md:order-first max-md:me-auto">
        <Languages className="size-5" />
        <LanguageToggleText className="md:hidden" />
      </LanguageToggle>,
    );
  }

  if (collapsible) {
    footer.push(
      <SidebarCollapseTrigger key="sidebar" className="max-md:hidden" />,
    );
  }

  let tabs: Option[] = [];
  if (Array.isArray(tabOptions)) tabs = tabOptions;
  else if (typeof tabOptions === 'object')
    tabs = getSidebarTabs(props.tree, tabOptions);
  else if (tabOptions !== false) tabs = getSidebarTabs(props.tree);

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {replaceOrDefault(nav, <SubNav className="h-14 md:hidden" {...nav} />)}
        <main
          id="nd-docs-layout"
          {...props.containerProps}
          className={cn(
            'flex flex-1 flex-row',
            !nav.component &&
              nav.enabled !== false &&
              '[--fd-nav-height:3.5rem] md:[--fd-nav-height:0px]',
            props.containerProps?.className,
          )}
        >
          {replaceOrDefault(
            { enabled: sidebarEnabled, component: sidebarReplace },
            <Aside
              {...sidebar}
              banner={
                <div className="flex flex-col gap-1 px-4 empty:hidden md:px-3 md:pb-2">
                  {header.length > 0 ? (
                    <div className="flex flex-row items-center border-b pb-2 max-md:hidden">
                      {header}
                    </div>
                  ) : null}
                  {tabs.length > 0 ? <RootToggle options={tabs} /> : null}
                  {sidebar.banner}
                </div>
              }
              footer={
                <>
                  <div className="flex flex-row items-center border-t py-1 empty:hidden max-md:gap-1.5 max-md:px-4 md:mx-3">
                    {footer}
                  </div>
                  {sidebar.footer}
                </>
              }
            >
              <div className="flex flex-col px-4 pt-4 empty:hidden md:hidden">
                {links
                  .filter((v) => v.type !== 'icon')
                  .map((item, i) => (
                    <MenuItem key={i} item={item} />
                  ))}
              </div>
            </Aside>,
          )}
          {props.children}
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

export { getSidebarTabs, type TabOptions };
