import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode, HTMLAttributes } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/theme/variants';
import type { SidebarProps } from '@/components/layout/sidebar';
import { replaceOrDefault } from './utils/shared';
import type { LinkItemType } from './components/layout/link-item';
import { type BaseLayoutProps, getLinks } from './layout.shared';

declare const {
  TreeContextProvider,
  SubNav,
  LinksMenu,
  Sidebar,
  ThemeToggle,
}: typeof import('./docs-layout.client');

// We can use dynamic imports to avoid loading a client component when they are not used
const LanguageToggle = dynamic(() =>
  import('./components/layout/language-toggle').then(
    (mod) => mod.LanguageToggle,
  ),
);

const DynamicSidebar = dynamic(() =>
  import('./components/layout/dynamic-sidebar').then(
    (mod) => mod.DynamicSidebar,
  ),
);

export type { LinkItemType };

interface SidebarOptions extends Omit<SidebarProps, 'items'> {
  enabled: boolean;
  component: ReactNode;
  collapsible: boolean;
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
  containerProps = {},
  tree,
  i18n = false,
  children,
}: DocsLayoutProps): React.ReactElement {
  const finalLinks = getLinks(links, githubUrl);
  const Aside = collapsible ? DynamicSidebar : Sidebar;

  return (
    <TreeContextProvider tree={tree}>
      {replaceOrDefault(nav, <SubNav {...nav} />)}
      <main
        id="nd-docs-layout"
        {...containerProps}
        className={cn('flex flex-1 flex-row', containerProps.className)}
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
                    <LinksMenu
                      items={finalLinks}
                      className={cn(
                        buttonVariants({
                          size: 'icon',
                          color: 'ghost',
                        }),
                      )}
                    >
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
      </main>
    </TreeContextProvider>
  );
}
