import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, type HTMLAttributes } from 'react';
import Link from 'next/link';
import { Languages, MoreHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import type { SidebarProps } from '@/components/layout/sidebar';
import { replaceOrDefault, type SharedNavProps } from '@/layouts/shared';
import type { LinkItemType, IconItem as IconItemType } from '@/layouts/links';
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
  nav: {
    enabled: navEnabled = true,
    component: navReplace,
    transparentMode,
    ...nav
  } = {},
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

  let tabs: Option[] = [];
  if (Array.isArray(tabOptions)) {
    tabs = tabOptions;
  } else if (typeof tabOptions === 'object') {
    tabs = getSidebarTabs(props.tree, tabOptions);
  } else if (tabOptions !== false) {
    tabs = getSidebarTabs(props.tree);
  }

  const banner = (
    <div className="flex flex-col gap-1 px-4 empty:hidden md:px-3 md:pb-2">
      <SidebarHeader {...nav} links={links} />
      {tabs.length > 0 ? <RootToggle className="-mx-1" options={tabs} /> : null}
      {sidebar.banner}
    </div>
  );

  const footer = (
    <>
      <div className="flex flex-row items-center border-t py-1 empty:hidden max-md:gap-1.5 max-md:px-3 md:mx-3">
        <SidebarFooter
          sidebarCollapsible={collapsible}
          i18n={i18n}
          disableThemeSwitch={props.disableThemeSwitch ?? false}
          iconItems={links.filter((v) => v.type === 'icon')}
        />
      </div>
      {sidebar.footer}
    </>
  );

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {replaceOrDefault(
          { enabled: navEnabled, component: navReplace },
          <SubNav className="h-14 md:hidden" {...nav} />,
          nav,
        )}
        <main
          id="nd-docs-layout"
          {...props.containerProps}
          className={cn(
            'flex flex-1 flex-row',
            !navReplace && navEnabled
              ? '[--fd-nav-height:3.5rem] md:[--fd-nav-height:0px]'
              : null,
            props.containerProps?.className,
          )}
        >
          {replaceOrDefault(
            { enabled: sidebarEnabled, component: sidebarReplace },
            <Aside {...sidebar} banner={banner} footer={footer}>
              <div className="flex flex-col px-2 pt-4 empty:hidden md:hidden">
                {links
                  .filter((v) => v.type !== 'icon')
                  .map((item, i) => (
                    <MenuItem key={i} item={item} />
                  ))}
              </div>
            </Aside>,
            {
              ...sidebar,
              banner,
              footer,
            },
          )}
          {props.children}
        </main>
      </NavProvider>
    </TreeContextProvider>
  );
}

function SidebarHeader({
  links,
  ...props
}: SharedNavProps & { links: LinkItemType[] }): ReactNode {
  if (!props.title || !props.children || links.length === 0) return null;

  return (
    <div className="flex flex-row items-center border-b pb-2 max-md:hidden">
      {props.title ? (
        <Link
          href={props.url ?? '/'}
          className="inline-flex items-center gap-2.5 py-1 font-medium"
        >
          {props.title}
        </Link>
      ) : null}
      {props.children}
      {links.length > 0 ? (
        <LinksMenu
          items={links.map((item, i) => (
            <MenuItem key={i} item={item} />
          ))}
          className={cn(
            buttonVariants({
              size: 'icon',
              color: 'ghost',
            }),
            'ms-auto',
          )}
        >
          <MoreHorizontal />
        </LinksMenu>
      ) : null}
    </div>
  );
}

function SidebarFooter({
  iconItems,
  ...props
}: {
  i18n: boolean;
  iconItems: IconItemType[];
  disableThemeSwitch: boolean;
  sidebarCollapsible: boolean;
}): ReactNode {
  if (props.i18n) {
    return (
      <>
        {iconItems.length > 0 ? (
          <div className="flex flex-row items-center md:hidden">
            {iconItems.map((item, i) => (
              <IconItem
                key={i}
                item={item}
                className="text-fd-muted-foreground"
              />
            ))}
          </div>
        ) : null}
        {!props.disableThemeSwitch ? <ThemeToggle /> : null}
        <LanguageToggle className="max-md:order-first max-md:me-auto md:ms-auto">
          <Languages className="size-5" />
          <LanguageToggleText className="md:hidden" />
        </LanguageToggle>
        {props.sidebarCollapsible ? (
          <SidebarCollapseTrigger className="max-md:hidden" />
        ) : null}
      </>
    );
  }

  return (
    <>
      {iconItems.length > 0 ? (
        <div className="flex flex-row items-center md:hidden">
          {iconItems.map((item, i) => (
            <IconItem
              key={i}
              item={item}
              className="text-fd-muted-foreground"
            />
          ))}
        </div>
      ) : null}
      {!props.disableThemeSwitch ? (
        <ThemeToggle className="max-md:ms-auto" />
      ) : null}
      {props.sidebarCollapsible ? (
        <SidebarCollapseTrigger className="ms-auto max-md:hidden" />
      ) : null}
    </>
  );
}

export { getSidebarTabs, type TabOptions, type LinkItemType };
