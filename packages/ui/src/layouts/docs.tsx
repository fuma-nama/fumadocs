import type { PageTree } from 'fumadocs-core/server';
import { ReactNode, HTMLAttributes, Fragment } from 'react';
import Link from 'next/link';
import { MoreHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { SidebarProps } from '@/components/layout/sidebar';
import { replaceOrDefault } from '@/utils/shared';
import type { LinkItemType } from '@/components/layout/link-item';
import { type BaseLayoutProps, getLinks } from './shared';

declare const {
  TreeContextProvider,
  SidebarCollapseTrigger,
  ThemeToggle,
  SubNav,
  LanguageToggle,
  LinksMenu,
  LinkItem,
  DynamicSidebar,
  Sidebar,
}: typeof import('./docs.client');

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
  i18n = false,
  ...props
}: DocsLayoutProps): React.ReactNode {
  const links = getLinks(props.links ?? [], githubUrl);
  const Aside = collapsible ? DynamicSidebar : Sidebar;

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- Prevent people passing undefined page tree
  if (props.tree === undefined) notFound();

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

  if (sidebar.footer) {
    footer.push(<Fragment key="footer">{sidebar.footer}</Fragment>);
  }

  if (!props.disableThemeSwitch) {
    footer.push(<ThemeToggle key="theme" className="me-auto" />);
  }

  if (i18n) {
    footer.push(<LanguageToggle key="i18n" />);
  }

  if (links.some((v) => v.type === 'icon')) {
    footer.push(
      <Fragment key="links">
        {links
          .filter((v) => v.type === 'icon')
          .map((v, i) => (
            <LinkItem key={i} item={v} on="nav" className="md:hidden" />
          ))}
      </Fragment>,
    );
  }

  if (collapsible) {
    footer.push(
      <SidebarCollapseTrigger key="sidebar" className="max-md:hidden" />,
    );
  }

  return (
    <TreeContextProvider tree={props.tree}>
      {replaceOrDefault(nav, <SubNav {...nav} />)}
      <main
        id="nd-docs-layout"
        {...props.containerProps}
        className={cn('flex flex-1 flex-row', props.containerProps?.className)}
      >
        {replaceOrDefault(
          { enabled: sidebarEnabled, component: sidebarReplace },
          <Aside
            {...sidebar}
            items={links.filter((v) => v.type !== 'icon')}
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
            footer={footer.length > 0 ? footer : null}
          />,
        )}
        {props.children}
      </main>
    </TreeContextProvider>
  );
}
