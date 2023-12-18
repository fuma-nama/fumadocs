import { GithubIcon } from 'lucide-react';
import type { PageTree } from 'next-docs-zeta/server';
import type { ReactNode, HTMLAttributes } from 'react';
import type { SidebarProps } from '@/components/sidebar';
import type { NavItemProps, NavLinkProps } from './nav';
import { replaceOrDefault } from './utils/shared';
import { setPageTree } from './utils/global';
import { cn } from './utils/cn';
import type { LinkItem } from './contexts/tree';

const { Nav, TreeContextProvider, Sidebar } = await import('./layout.client');

export interface BaseLayoutProps {
  links?: LinkItem[];
  /**
   * Replace or disable navbar
   */
  nav?: Partial<{
    enabled: boolean;
    component: ReactNode;
    title: ReactNode;
    children: ReactNode;

    /**
     * Redirect url of title
     * @defaultValue '/'
     */
    url: string;

    /**
     * @deprecated use `DocsLayoutProps.links` instead
     */
    items: NavItemProps[];

    /**
     * Github url displayed on the navbar
     */
    githubUrl: string;
  }>;

  children: ReactNode;
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree;

  sidebar?: Partial<
    SidebarProps & {
      enabled: boolean;
      component: ReactNode;
      collapsible: boolean;

      /**
       * Open folders by default if their level is lower or equal to a specific level
       * (Starting from 1)
       *
       * @defaultValue 1
       */
      defaultOpenLevel: number;
    }
  >;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function Layout({
  nav = {},
  links = [],
  children,
}: BaseLayoutProps): JSX.Element {
  return (
    <>
      {getNav(false, false, links, nav)}
      {children}
    </>
  );
}

export function DocsLayout({
  nav = {},
  sidebar = {},
  links = [],
  containerProps,
  tree,
  children,
}: DocsLayoutProps): JSX.Element {
  setPageTree(tree);
  const sidebarEnabled = sidebar.enabled ?? true;
  const sidebarCollaspible = sidebarEnabled && (sidebar.collapsible ?? true);

  return (
    <TreeContextProvider value={tree}>
      {getNav(sidebarEnabled, sidebarCollaspible, links, nav)}
      <div
        {...containerProps}
        className={cn(
          'container flex flex-row gap-6 xl:gap-12',
          containerProps?.className,
        )}
      >
        {replaceOrDefault(
          sidebar,
          <Sidebar
            items={links}
            defaultOpenLevel={sidebar.defaultOpenLevel}
            banner={sidebar.banner}
            footer={sidebar.footer}
          />,
        )}

        {children}
      </div>
    </TreeContextProvider>
  );
}

function getNav(
  enableSidebar: boolean,
  collapsibleSidebar: boolean,
  links: BaseLayoutProps['links'],
  nav: BaseLayoutProps['nav'] = {},
): ReactNode {
  const iconLinks: NavLinkProps[] = [];

  if (nav.githubUrl)
    iconLinks.push({
      href: nav.githubUrl,
      label: 'Github',
      icon: <GithubIcon />,
      external: true,
    });

  return replaceOrDefault(
    nav,
    <Nav
      title={nav.title}
      url={nav.url}
      items={links}
      links={iconLinks}
      enableSidebar={enableSidebar}
      collapsibleSidebar={collapsibleSidebar}
    >
      {nav.children}
    </Nav>,
  );
}
