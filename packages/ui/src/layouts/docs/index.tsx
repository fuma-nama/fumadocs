import type { PageTree } from 'fumadocs-core/server';
import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  useMemo,
} from 'react';
import { Languages, Sidebar as SidebarIcon } from 'lucide-react';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  Sidebar,
  SidebarCollapseTrigger,
  type SidebarComponents,
  SidebarContent,
  SidebarContentMobile,
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarItem,
  SidebarPageTree,
  type SidebarProps,
  SidebarTrigger,
  SidebarViewport,
} from '@/components/layout/sidebar';
import { type Option, RootToggle } from '@/components/layout/root-toggle';
import {
  type BaseLayoutProps,
  BaseLinkItem,
  getLinks,
  type IconItemType,
  type LinkItemType,
} from '@/layouts/shared';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import { CollapsibleControl, LayoutBody, Navbar } from '@/layouts/docs/client';
import { TreeContextProvider } from '@/contexts/tree';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NavProvider } from '@/contexts/layout';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { HideIfEmpty } from 'fumadocs-core/hide-if-empty';
import {
  getSidebarTabs,
  type GetSidebarTabsOptions,
} from '@/utils/get-sidebar-tabs';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;

  sidebar?: SidebarOptions;

  /**
   * Props for the `div` container
   */
  containerProps?: HTMLAttributes<HTMLDivElement>;
}

interface SidebarOptions
  extends ComponentProps<'aside'>,
    Pick<SidebarProps, 'defaultOpenLevel' | 'prefetch'> {
  enabled?: boolean;
  component?: ReactNode;
  components?: Partial<SidebarComponents>;

  /**
   * Root Toggle options
   */
  tabs?: Option[] | GetSidebarTabsOptions | false;

  banner?: ReactNode;
  footer?: ReactNode;

  /**
   * Support collapsing the sidebar on desktop mode
   *
   * @defaultValue true
   */
  collapsible?: boolean;
}

export function DocsLayout({
  nav: { transparentMode, ...nav } = {},
  sidebar: {
    tabs: sidebarTabs,
    enabled: sidebarEnabled = true,
    ...sidebarProps
  } = {},
  searchToggle = {},
  disableThemeSwitch = false,
  themeSwitch = { enabled: !disableThemeSwitch },
  i18n = false,
  children,
  ...props
}: DocsLayoutProps) {
  const tabs = useMemo(() => {
    if (Array.isArray(sidebarTabs)) {
      return sidebarTabs;
    }
    if (typeof sidebarTabs === 'object') {
      return getSidebarTabs(props.tree, sidebarTabs);
    }
    if (sidebarTabs !== false) {
      return getSidebarTabs(props.tree);
    }
    return [];
  }, [sidebarTabs, props.tree]);
  const links = getLinks(props.links ?? [], props.githubUrl);
  const sidebarVariables = cn(
    'md:[--fd-sidebar-width:268px] lg:[--fd-sidebar-width:286px]',
  );

  function sidebar() {
    const {
      footer,
      banner,
      collapsible = true,
      component,
      components,
      defaultOpenLevel,
      prefetch,
      ...rest
    } = sidebarProps;
    if (component) return component;

    const iconLinks = links.filter(
      (item): item is IconItemType => item.type === 'icon',
    );

    const viewport = (
      <SidebarViewport>
        {links
          .filter((v) => v.type !== 'icon')
          .map((item, i, list) => (
            <SidebarLinkItem
              key={i}
              item={item}
              className={cn(i === list.length - 1 && 'mb-4')}
            />
          ))}
        <SidebarPageTree components={components} />
      </SidebarViewport>
    );

    const mobile = (
      <SidebarContentMobile {...rest}>
        <SidebarHeader>
          <div className="flex text-fd-muted-foreground items-center gap-1.5">
            <div className="flex flex-1">
              {iconLinks.map((item, i) => (
                <BaseLinkItem
                  key={i}
                  item={item}
                  className={cn(
                    buttonVariants({
                      size: 'icon-sm',
                      color: 'ghost',
                      className: 'p-2',
                    }),
                  )}
                  aria-label={item.label}
                >
                  {item.icon}
                </BaseLinkItem>
              ))}
            </div>
            {i18n ? (
              <LanguageToggle>
                <Languages className="size-4.5" />
                <LanguageToggleText />
              </LanguageToggle>
            ) : null}
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? (
                <ThemeToggle className="p-0" mode={themeSwitch.mode} />
              ))}
            <SidebarTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon-sm',
                  className: 'p-2',
                }),
              )}
            >
              <SidebarIcon />
            </SidebarTrigger>
          </div>
          {tabs.length > 0 && <RootToggle options={tabs} />}
          {banner}
        </SidebarHeader>
        {viewport}
        <SidebarFooter className="empty:hidden">{footer}</SidebarFooter>
      </SidebarContentMobile>
    );

    const content = (
      <SidebarContent {...rest}>
        <SidebarHeader>
          <div className="flex">
            <Link
              href={nav.url ?? '/'}
              className="inline-flex text-[15px] items-center gap-2.5 font-medium me-auto"
            >
              {nav.title}
            </Link>
            {nav.children}
            {collapsible && (
              <SidebarCollapseTrigger
                className={cn(
                  buttonVariants({
                    color: 'ghost',
                    size: 'icon-sm',
                    className: 'mb-auto text-fd-muted-foreground',
                  }),
                )}
              >
                <SidebarIcon />
              </SidebarCollapseTrigger>
            )}
          </div>
          {searchToggle.enabled !== false &&
            (searchToggle.components?.lg ?? (
              <LargeSearchToggle hideIfDisabled />
            ))}
          {tabs.length > 0 && <RootToggle options={tabs} />}

          {banner}
        </SidebarHeader>
        {viewport}
        <HideIfEmpty as={SidebarFooter}>
          <div className="flex text-fd-muted-foreground items-center empty:hidden">
            {i18n ? (
              <LanguageToggle>
                <Languages className="size-4.5" />
              </LanguageToggle>
            ) : null}
            {iconLinks.map((item, i) => (
              <BaseLinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                )}
                aria-label={item.label}
              >
                {item.icon}
              </BaseLinkItem>
            ))}
            {themeSwitch.enabled !== false &&
              (themeSwitch.component ?? (
                <ThemeToggle className="ms-auto p-0" mode={themeSwitch.mode} />
              ))}
          </div>
          {footer}
        </HideIfEmpty>
      </SidebarContent>
    );

    return (
      <Sidebar
        defaultOpenLevel={defaultOpenLevel}
        prefetch={prefetch}
        Mobile={mobile}
        Content={
          <>
            {collapsible && <CollapsibleControl />}
            {content}
          </>
        }
      />
    );
  }

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        {nav.enabled !== false &&
          (nav.component ?? (
            <Navbar className="h-14 md:hidden">
              <Link
                href={nav.url ?? '/'}
                className="inline-flex items-center gap-2.5 font-semibold"
              >
                {nav.title}
              </Link>
              <div className="flex-1">{nav.children}</div>
              {searchToggle.enabled !== false &&
                (searchToggle.components?.sm ?? (
                  <SearchToggle className="p-2" hideIfDisabled />
                ))}
              {sidebarEnabled && (
                <SidebarTrigger
                  className={cn(
                    buttonVariants({
                      color: 'ghost',
                      size: 'icon-sm',
                      className: 'p-2',
                    }),
                  )}
                >
                  <SidebarIcon />
                </SidebarTrigger>
              )}
            </Navbar>
          ))}
        <LayoutBody
          {...props.containerProps}
          className={cn(
            'md:[&_#nd-page_article]:pt-12 xl:[--fd-toc-width:286px] xl:[&_#nd-page_article]:px-8',
            sidebarEnabled && sidebarVariables,
            !nav.component &&
              nav.enabled !== false &&
              '[--fd-nav-height:56px] md:[--fd-nav-height:0px]',
            props.containerProps?.className,
          )}
        >
          {sidebarEnabled && sidebar()}
          {children}
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

function SidebarLinkItem({
  item,
  ...props
}: {
  item: Exclude<LinkItemType, { type: 'icon' }>;
  className?: string;
}) {
  if (item.type === 'menu')
    return (
      <SidebarFolder {...props}>
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
            <SidebarLinkItem key={i} item={child} />
          ))}
        </SidebarFolderContent>
      </SidebarFolder>
    );

  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  return (
    <SidebarItem
      href={item.url}
      icon={item.icon}
      external={item.external}
      {...props}
    >
      {item.text}
    </SidebarItem>
  );
}

export { CollapsibleControl, Navbar, SidebarTrigger, type LinkItemType };
