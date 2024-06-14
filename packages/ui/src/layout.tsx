import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode, HTMLAttributes } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { NavProps } from './components/layout/nav';
import { replaceOrDefault } from './utils/shared';
import type { SidebarProps } from './components/layout/sidebar';

declare const { Nav }: typeof import('./layout.client');

declare const {
  TreeContextProvider,
  DynamicSidebar,
  SubNav,
  LinksMenu,
  Sidebar,
  ThemeToggle,
}: typeof import('./docs.client');

declare const {
  LanguageToggle,
}: typeof import('./components/layout/language-toggle');

type ActiveType = 'none' | 'url' | 'nested-url';

export type LinkItemType =
  | {
      type?: 'main';
      url: string;
      /**
       * When the item is marked as active
       *
       * @defaultValue 'url'
       */
      active?: ActiveType;
      icon?: ReactNode;
      text: string;
      external?: boolean;
    }
  | {
      type: 'menu';
      icon?: ReactNode;
      text: string;
      items: LinkItemType[];
    }
  | {
      type: 'secondary';
      url: string;
      /**
       * When the item is marked as active
       *
       * @defaultValue 'url'
       */
      active?: ActiveType;
      icon: ReactNode;
      text: string;
      external?: boolean;
    };

interface NavOptions extends Omit<NavProps, 'items'> {
  enabled: boolean;
  component: ReactNode;
}

interface SidebarOptions extends Omit<SidebarProps, 'items'> {
  enabled: boolean;
  component: ReactNode;
  collapsible: boolean;
}

export interface BaseLayoutProps {
  /**
   * GitHub url
   */
  githubUrl?: string;

  links?: LinkItemType[];
  /**
   * Replace or disable navbar
   */
  nav?: Partial<NavOptions>;

  children?: ReactNode;
}

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: Partial<SidebarOptions>;

  containerProps?: HTMLAttributes<HTMLDivElement>;

  /**
   * Enable Language Switch
   *
   * @defaultValue false
   */
  i18n?: boolean;
}

export function Layout({
  nav = {},
  links = [],
  githubUrl,
  children,
}: BaseLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, githubUrl);

  return (
    <>
      {replaceOrDefault(
        nav,
        <Nav items={finalLinks} {...nav}>
          {nav.children}
        </Nav>,
      )}
      {children}
    </>
  );
}

export function DocsLayout({
  nav,
  githubUrl,
  sidebar: {
    enabled: sidebarEnabled = true,
    collapsible = true,
    component: sidebarReplace,
    ...sidebar
  } = {},
  links = [],
  containerProps,
  tree,
  i18n = false,
  children,
}: DocsLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, githubUrl);
  const Aside = sidebarEnabled && collapsible ? DynamicSidebar : Sidebar;

  return (
    <TreeContextProvider tree={tree}>
      {replaceOrDefault(nav, <SubNav {...nav} />)}
      <div
        {...containerProps}
        className={cn('flex flex-1 flex-row', containerProps?.className)}
      >
        {replaceOrDefault(
          { enabled: sidebarEnabled, component: sidebarReplace },
          <Aside
            {...sidebar}
            items={finalLinks}
            banner={
              <>
                <div className="flex flex-row items-center justify-between border-b pb-2 max-md:hidden">
                  <Link
                    href={nav?.url ?? '/'}
                    className="inline-flex items-center gap-2.5 font-medium"
                  >
                    {nav?.title}
                  </Link>
                  {finalLinks.length > 0 && (
                    <LinksMenu items={finalLinks}>
                      <MoreHorizontal />
                    </LinksMenu>
                  )}
                </div>

                {sidebar.banner}
              </>
            }
            bannerProps={{
              className: cn(
                !sidebar.banner && 'max-md:hidden',
                sidebar.bannerProps?.className,
              ),
              ...sidebar.bannerProps,
            }}
            footer={
              <>
                <ThemeToggle className="me-auto" />
                {sidebar.footer}
                {i18n ? <LanguageToggle /> : null}
              </>
            }
          />,
        )}

        {children}
      </div>
    </TreeContextProvider>
  );
}

function getLinks(links?: LinkItemType[], githubUrl?: string): LinkItemType[] {
  let result = links ?? [];

  if (githubUrl)
    result = [
      ...result,
      {
        type: 'secondary',
        url: githubUrl,
        text: 'Github',
        icon: (
          <svg role="img" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        ),
        external: true,
      },
    ];

  return result;
}
