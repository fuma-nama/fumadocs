import type { PageTree } from 'fumadocs-core/server';
import { ReactNode, HTMLAttributes, Fragment } from 'react';
import Link from 'next/link';
import { Languages, MoreHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { SidebarProps } from '@/components/layout/sidebar';
import { replaceOrDefault } from '@/layouts/shared';
import type { LinkItemType } from '@/layouts/links';
import { getSidebarTabs, type TabOptions } from '@/utils/get-sidebar-tabs';
import { Option } from '@/components/layout/root-toggle';
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
  DynamicSidebar,
  Sidebar,
  IconItem,
  MenuItem,
  NavProvider,
}: typeof import('./docs.client');

export type { LinkItemType };

interface SidebarOptions extends Omit<SidebarProps, 'items'> {
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
}: DocsLayoutProps): React.ReactNode {
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = collapsible ? DynamicSidebar : Sidebar;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Prevent people passing undefined page tree
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
      <Fragment key="children">{nav.children}</Fragment>,
    );

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
      <Fragment key="links">
        {iconLinks.map((item, i) => (
          <IconItem
            key={i}
            item={item}
            className="text-fd-muted-foreground md:hidden"
          />
        ))}
      </Fragment>,
    );
  }

  if (sidebar.footer) {
    footer.push(<Fragment key="footer">{sidebar.footer}</Fragment>);
  }

  if (!props.disableThemeSwitch) {
    footer.push(
      <ThemeToggle key="theme" className="max-md:ms-auto md:me-auto" />,
    );
  }

  if (i18n) {
    footer.push(
      <LanguageToggle key="i18n" className="max-md:order-first">
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
              items={links.filter((v) => v.type !== 'icon')}
              banner={
                header.length > 0 ||
                Boolean(sidebar.banner) ||
                tabs.length > 0 ? (
                  <>
                    {header.length > 0 ? (
                      <div className="flex flex-row items-center border-b pb-2 max-md:hidden">
                        {header}
                      </div>
                    ) : null}
                    {tabs.length > 0 ? <RootToggle options={tabs} /> : null}
                    {sidebar.banner}
                  </>
                ) : null
              }
              footer={footer.length > 0 ? footer : null}
            />,
          )}
          {props.children}
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

export { getSidebarTabs, type TabOptions };
