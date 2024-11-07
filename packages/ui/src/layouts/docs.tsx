import type { PageTree } from 'fumadocs-core/server';
import { type ReactNode, type HTMLAttributes, Fragment, type FC } from 'react';
import Link from 'next/link';
import { Languages, MoreHorizontal } from 'lucide-react';
import { notFound } from 'next/navigation';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  CollapsibleSidebar,
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarCollapseTrigger,
  type SidebarProps,
  SidebarViewport,
  SidebarItem,
  SidebarFolder,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarFolderContent,
} from '@/layouts/docs/sidebar';
import { replaceOrDefault, type SharedNavProps } from '@/layouts/shared';
import {
  type LinkItemType,
  type IconItemType,
  BaseLinkItem,
} from '@/layouts/links';
import { getSidebarTabs, type TabOptions } from '@/utils/get-sidebar-tabs';
import { type Option, RootToggle } from '@/components/layout/root-toggle';
import { type BaseLayoutProps, getLinks } from './shared';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import { SidebarItems, LinksMenu } from '@/layouts/docs.client';
import { TreeContextProvider } from '@/contexts/tree';
import { NavProvider, Title } from '@/components/layout/nav';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Navbar, NavbarSidebarTrigger } from '@/layouts/docs/navbar';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { SearchOnly } from '@/contexts/search';

interface SidebarOptions extends SidebarProps {
  enabled: boolean;
  component: ReactNode;

  collapsible?: boolean;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | TabOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Hide search trigger
   *
   * @defaultValue false
   */
  hideSearch?: boolean;
}

export interface SidebarComponents {
  Item: FC<{ item: PageTree.Item }>;
  Folder: FC<{ item: PageTree.Folder; level: number }>;
  Separator: FC<{ item: PageTree.Separator }>;
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
    banner: sidebarBanner,
    footer: sidebarFooter,
    components: sidebarComponents,
    ...sidebar
  } = {},
  i18n = false,
  ...props
}: DocsLayoutProps): ReactNode {
  const links = getLinks(props.links ?? [], props.githubUrl);
  const Aside = collapsible ? CollapsibleSidebar : Sidebar;
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
    <>
      <CustomSidebarHeader {...nav} links={links} />
      {sidebarBanner}
    </>
  );

  const footer = (
    <>
      <CustomSidebarFooter
        sidebarCollapsible={collapsible}
        i18n={i18n}
        disableThemeSwitch={props.disableThemeSwitch ?? false}
        iconItems={links.filter((v) => v.type === 'icon')}
      />
      {sidebarFooter}
    </>
  );

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {replaceOrDefault(
          { enabled: navEnabled, component: navReplace },
          <Navbar className="h-14 md:hidden">
            <Title url={nav.url} title={nav.title} />
            <div className="flex flex-1 flex-row items-center gap-1">
              {nav.children}
            </div>
            <SearchOnly>
              <SearchToggle />
            </SearchOnly>
            <NavbarSidebarTrigger />
          </Navbar>,
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
            <Aside {...sidebar}>
              <SidebarHeader>
                {banner}
                {tabs.length > 0 ? (
                  <RootToggle options={tabs} className="-mx-2" />
                ) : null}
                <SearchOnly>
                  <LargeSearchToggle className="rounded-lg max-md:hidden" />
                </SearchOnly>
              </SidebarHeader>
              <SidebarViewport>
                <div className="px-4 pt-4 empty:hidden md:hidden">
                  {links
                    .filter((v) => v.type !== 'icon')
                    .map((item, i) => (
                      <Fragment key={i}>{renderLinkItem(item)}</Fragment>
                    ))}
                </div>
                <SidebarItems components={sidebarComponents} />
              </SidebarViewport>
              <SidebarFooter>{footer}</SidebarFooter>
            </Aside>,
            {
              ...sidebar,
              tabs,
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

function renderLinkItem(item: LinkItemType): ReactNode {
  if (!item.type || item.type === 'main' || item.type === 'icon')
    return (
      <SidebarItem href={item.url} icon={item.icon} external={item.external}>
        {item.text}
      </SidebarItem>
    );

  if (item.type === 'menu')
    return (
      <SidebarFolder level={1}>
        {item.url ? (
          <SidebarFolderLink href={item.url}>
            {item.icon}
            {item.text}
          </SidebarFolderLink>
        ) : (
          <SidebarFolderTrigger>
            {item.icon}
            {item.text}
          </SidebarFolderTrigger>
        )}
        <SidebarFolderContent>
          {item.items.map((child, i) => (
            <Fragment key={i}>{renderLinkItem(child)}</Fragment>
          ))}
        </SidebarFolderContent>
      </SidebarFolder>
    );

  if (item.type === 'button') {
    return (
      <BaseLinkItem
        item={item}
        className={cn(
          buttonVariants({
            color: 'secondary',
            className: 'gap-1.5 [&_svg]:size-4',
          }),
        )}
      >
        {item.icon}
        {item.text}
      </BaseLinkItem>
    );
  }

  if (item.type === 'custom') return item.children;
}

function CustomSidebarHeader({
  links,
  ...props
}: SharedNavProps & { links: LinkItemType[] }): ReactNode {
  const isEmpty = !props.title && !props.children && links.length === 0;
  if (isEmpty) return null;

  return (
    <div className="flex flex-row items-center max-md:hidden">
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
          items={links}
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

function CustomSidebarFooter({
  iconItems,
  ...props
}: {
  i18n: boolean;
  iconItems: IconItemType[];
  disableThemeSwitch: boolean;
  sidebarCollapsible: boolean;
}) {
  const iconItem = cn(
    buttonVariants({ size: 'icon', color: 'ghost' }),
    'text-fd-muted-foreground md:hidden',
  );

  if (props.i18n) {
    return (
      <div className="flex flex-row items-center">
        {iconItems.map((item, i) => (
          <BaseLinkItem
            key={i}
            item={item}
            className={iconItem}
            aria-label={item.label}
          >
            {item.icon}
          </BaseLinkItem>
        ))}
        {!props.disableThemeSwitch ? <ThemeToggle /> : null}
        <LanguageToggle className="max-md:order-first max-md:me-auto md:ms-auto">
          <Languages className="size-5" />
          <LanguageToggleText className="md:hidden" />
        </LanguageToggle>
        {props.sidebarCollapsible ? (
          <SidebarCollapseTrigger className="max-md:hidden" />
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center">
      {iconItems.map((item, i) => (
        <BaseLinkItem
          key={i}
          item={item}
          className={iconItem}
          aria-label={item.label}
        >
          {item.icon}
        </BaseLinkItem>
      ))}
      {!props.disableThemeSwitch ? (
        <ThemeToggle className="p-0 max-md:ms-auto" />
      ) : null}
      {props.sidebarCollapsible ? (
        <SidebarCollapseTrigger className="-me-1.5 ms-auto max-md:hidden" />
      ) : null}
    </div>
  );
}

export { getSidebarTabs, type TabOptions, type LinkItemType };
