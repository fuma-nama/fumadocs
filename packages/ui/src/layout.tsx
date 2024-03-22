import { GithubIcon } from 'lucide-react';
import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode, HTMLAttributes } from 'react';
import type { NavProps } from './components/nav';
import { replaceOrDefault } from './utils/shared';
import { cn } from './utils/cn';
import type { SidebarProps } from './components/sidebar';

declare const {
  Nav,
  TreeContextProvider,
  Sidebar,
}: typeof import('./layout.client');

export interface LinkItem {
  url: string;
  icon?: ReactNode;
  text: string;
  external?: boolean;
}

interface NavOptions
  extends Omit<NavProps, 'enableSidebar' | 'collapsibleSidebar' | 'items'> {
  enabled: boolean;
  component: ReactNode;

  /**
   * Github url displayed on the navbar
   */
  githubUrl: string;
}

interface SidebarOptions extends Omit<SidebarProps, 'items'> {
  enabled: boolean;
  component: ReactNode;
  collapsible: boolean;
}

export interface BaseLayoutProps {
  links?: LinkItem[];
  /**
   * Replace or disable navbar
   */
  nav?: Partial<NavOptions>;

  children: ReactNode;
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function Layout({
  nav = {},
  links = [],
  children,
}: BaseLayoutProps): React.ReactElement {
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
}: DocsLayoutProps): React.ReactElement {
  const sidebarEnabled = sidebar.enabled ?? true;
  const sidebarCollaspible = sidebarEnabled && (sidebar.collapsible ?? true);

  return (
    <TreeContextProvider tree={tree}>
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
  items: LinkItem[],
  { githubUrl, links, ...props }: Partial<NavOptions>,
): ReactNode {
  let iconLinks = links ?? [];

  if (githubUrl)
    iconLinks = [
      ...iconLinks,
      {
        href: githubUrl,
        label: 'Github',
        icon: <GithubIcon />,
        external: true,
      },
    ];

  return replaceOrDefault(
    props,
    <Nav
      title="My App"
      {...props}
      items={items}
      links={iconLinks}
      enableSidebar={enableSidebar}
      collapsibleSidebar={collapsibleSidebar}
    >
      {props.children}
    </Nav>,
  );
}
