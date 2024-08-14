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
  SidebarCollapseTrigger,
  ThemeToggle,
  SubNav,
  LinksMenu,
  Sidebar,
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
  containerProps = {},
  i18n = false,
  ...props
}: DocsLayoutProps): React.ReactElement {
  const links = getLinks(props.links ?? [], githubUrl);
  const Aside = collapsible ? DynamicSidebar : Sidebar;

  const banner: ReactNode[] = [];
  const footer: ReactNode[] = [];

  if (nav?.title)
    banner.push(
      <Link
        key="title"
        href={nav.url ?? '/'}
        className="inline-flex items-center gap-2.5 py-1 font-medium"
      >
        {nav.title}
      </Link>,
    );

  if (links.length > 0)
    banner.push(
      <LinksMenu
        key="links"
        items={links}
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

  footer.push(<ThemeToggle key="theme" />);

  if (i18n) {
    footer.push(<LanguageToggle key="i18n" />);
  }

  if (collapsible) {
    footer.push(<SidebarCollapseTrigger key="sidebar" />);
  }

  return (
    <TreeContextProvider tree={props.tree}>
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
            items={links}
            banner={
              banner.length > 0 || sidebar.banner ? (
                <>
                  {banner.length > 0 ? (
                    <div className="flex flex-row items-center border-b pb-2 max-md:hidden">
                      {banner}
                    </div>
                  ) : null}
                  {sidebar.banner}
                </>
              ) : null
            }
            bannerProps={{
              ...sidebar.bannerProps,
              className: cn(
                !sidebar.banner && 'max-md:hidden',
                sidebar.bannerProps?.className,
              ),
            }}
            footer={
              footer.length > 0 || sidebar.footer ? (
                <>
                  {sidebar.footer}
                  {footer}
                </>
              ) : null
            }
          />,
        )}
        {props.children}
      </main>
    </TreeContextProvider>
  );
}
