import {
  type ComponentProps,
  Fragment,
  type HTMLAttributes,
  useMemo,
} from 'react';
import { type BaseLayoutProps, getLinks } from '@/layouts/shared';
import {
  Sidebar,
  SidebarCollapseTrigger,
  SidebarContent,
  SidebarContentMobile,
  SidebarFooter,
  SidebarHeader,
  SidebarPageTree,
  SidebarTrigger,
  SidebarViewport,
} from '@/components/layout/sidebar';
import { TreeContextProvider } from '@/contexts/tree';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  ChevronDown,
  Languages,
  Sidebar as SidebarIcon,
  X,
} from 'lucide-react';
import { BaseLinkItem, type LinkItemType } from '@/layouts/links';
import { LanguageToggle } from '@/components/layout/language-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  getSidebarTabsFromOptions,
  SidebarLinkItem,
  type SidebarOptions,
} from '@/layouts/docs/shared';
import type { PageTree } from 'fumadocs-core/server';
import {
  LayoutBody,
  LayoutTabs,
  Navbar,
  NavbarSidebarTrigger,
} from './notebook-client';
import { NavProvider } from '@/contexts/layout';
import { type Option, RootToggle } from '@/components/layout/root-toggle';
import Link from 'fumadocs-core/link';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { HideIfEmpty } from 'fumadocs-core/hide-if-empty';

export interface DocsLayoutProps extends BaseLayoutProps {
  tree: PageTree.Root;
  tabMode?: 'sidebar' | 'navbar';

  nav?: BaseLayoutProps['nav'] & {
    mode?: 'top' | 'auto';
  };

  sidebar?: SidebarOptions & ComponentProps<'aside'>;

  containerProps?: HTMLAttributes<HTMLDivElement>;
}

export function DocsLayout(props: DocsLayoutProps) {
  const {
    tabMode = 'sidebar',
    nav: { transparentMode, ...nav } = {},
    sidebar: { tabs: tabOptions, ...sidebarProps } = {},
    i18n = false,
    disableThemeSwitch = false,
    themeSwitch = { enabled: !disableThemeSwitch },
  } = props;

  const navMode = nav.mode ?? 'auto';
  const links = getLinks(props.links ?? [], props.githubUrl);
  const tabs = useMemo(
    () => getSidebarTabsFromOptions(tabOptions, props.tree) ?? [],
    [tabOptions, props.tree],
  );

  const variables = cn(
    '[--fd-nav-height:56px] md:[--fd-sidebar-width:286px] md:[--fd-nav-height:64px] xl:[--fd-toc-width:286px]',
    tabs.length > 0 && tabMode === 'navbar' && 'lg:[--fd-nav-height:104px]',
  );

  function sidebar() {
    const {
      banner,
      footer,
      components,
      collapsible = true,
      prefetch,
      defaultOpenLevel,
      ...rest
    } = sidebarProps;
    const iconLinks = links.filter((item) => item.type === 'icon');

    const rootToggle = (
      <>
        {tabMode === 'sidebar' && tabs.length > 0 && (
          <RootToggle className="mb-2" options={tabs} />
        )}
        {tabMode === 'navbar' && tabs.length > 0 && (
          <RootToggle options={tabs} className="lg:hidden" />
        )}
      </>
    );

    const sidebarNav = (
      <div className="flex justify-between">
        <Link
          href={nav.url ?? '/'}
          className="inline-flex items-center gap-2.5 font-medium"
        >
          {nav.title}
        </Link>
        {collapsible && (
          <SidebarCollapseTrigger
            className={cn(
              buttonVariants({
                color: 'ghost',
                size: 'icon-sm',
                className: 'mt-px mb-auto text-fd-muted-foreground',
              }),
            )}
          >
            <SidebarIcon />
          </SidebarCollapseTrigger>
        )}
      </div>
    );

    const viewport = (
      <SidebarViewport>
        {links
          .filter((item) => item.type !== 'icon')
          .map((item, i, arr) => (
            <SidebarLinkItem
              key={i}
              item={item}
              className={cn('lg:hidden', i === arr.length - 1 && 'mb-4')}
            />
          ))}

        <SidebarPageTree components={components} />
      </SidebarViewport>
    );

    const content = (
      <SidebarContent
        {...rest}
        className={cn(
          navMode === 'top'
            ? 'border-e-0 bg-transparent'
            : '[--fd-nav-height:0px]',
          rest.className,
        )}
      >
        <HideIfEmpty as={SidebarHeader}>
          {navMode === 'auto' && sidebarNav}
          {nav.children}
          {banner}
          {rootToggle}
        </HideIfEmpty>
        {viewport}
        <HideIfEmpty
          as={SidebarFooter}
          className="flex flex-row text-fd-muted-foreground items-center"
        >
          {iconLinks.map((item, i) => (
            <BaseLinkItem
              key={i}
              item={item}
              className={cn(
                buttonVariants({
                  size: 'icon-sm',
                  color: 'ghost',
                  className: 'lg:hidden',
                }),
              )}
              aria-label={item.label}
            >
              {item.icon}
            </BaseLinkItem>
          ))}
          {footer}
        </HideIfEmpty>
      </SidebarContent>
    );

    const mobile = (
      <SidebarContentMobile {...rest}>
        <SidebarHeader>
          <SidebarTrigger
            className={cn(
              buttonVariants({
                size: 'icon-sm',
                color: 'ghost',
                className: 'ms-auto text-fd-muted-foreground',
              }),
            )}
          >
            <X />
          </SidebarTrigger>
          {banner}
          {rootToggle}
        </SidebarHeader>
        {viewport}
        <HideIfEmpty
          as={SidebarFooter}
          className="flex flex-row items-center justify-end"
        >
          {iconLinks.map((item, i) => (
            <BaseLinkItem
              key={i}
              item={item}
              className={cn(
                buttonVariants({
                  size: 'icon-sm',
                  color: 'ghost',
                }),
                'text-fd-muted-foreground lg:hidden',
                i === iconLinks.length - 1 && 'me-auto',
              )}
              aria-label={item.label}
            >
              {item.icon}
            </BaseLinkItem>
          ))}
          {i18n ? (
            <LanguageToggle>
              <Languages className="size-4.5 text-fd-muted-foreground" />
            </LanguageToggle>
          ) : null}
          {themeSwitch.enabled !== false &&
            (themeSwitch.component ?? (
              <ThemeToggle mode={themeSwitch.mode ?? 'light-dark-system'} />
            ))}
          {footer}
        </HideIfEmpty>
      </SidebarContentMobile>
    );

    return (
      <Sidebar
        defaultOpenLevel={defaultOpenLevel}
        prefetch={prefetch}
        Content={content}
        Mobile={mobile}
      />
    );
  }

  return (
    <TreeContextProvider tree={props.tree}>
      <NavProvider transparentMode={transparentMode}>
        <LayoutBody
          {...props.containerProps}
          className={cn(variables, props.containerProps?.className)}
        >
          {sidebar()}
          <DocsNavbar
            {...props}
            links={links}
            tabs={tabMode == 'navbar' ? tabs : []}
          />
          {props.children}
        </LayoutBody>
      </NavProvider>
    </TreeContextProvider>
  );
}

function DocsNavbar({
  links,
  tabs,
  searchToggle = {},
  themeSwitch = {},
  ...props
}: DocsLayoutProps & {
  links: LinkItemType[];
  tabs: Option[];
}) {
  const navMode = props.nav?.mode ?? 'auto';
  const sidebarCollapsible = props.sidebar?.collapsible ?? true;
  const nav = (
    <Link
      href={props.nav?.url ?? '/'}
      className={cn(
        'inline-flex items-center gap-2.5 font-semibold empty:hidden',
        navMode === 'auto' && 'md:hidden',
      )}
    >
      {props.nav?.title}
    </Link>
  );

  return (
    <Navbar mode={navMode}>
      <div
        className={cn(
          'flex border-b px-4 flex-1',
          navMode === 'auto' && 'md:px-6',
        )}
      >
        <div
          className={cn(
            'flex flex-row items-center',
            navMode === 'top' && 'flex-1 pe-4',
          )}
        >
          {sidebarCollapsible && navMode === 'auto' ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'ghost',
                  size: 'icon-sm',
                }),
                'text-fd-muted-foreground -ms-1.5 me-2 data-[collapsed=false]:hidden max-md:hidden',
              )}
            >
              <SidebarIcon />
            </SidebarCollapseTrigger>
          ) : null}
          {nav}
        </div>
        {searchToggle.enabled !== false &&
          (searchToggle.components?.lg ? (
            <div
              className={cn(
                'w-full my-auto max-md:hidden',
                navMode === 'top' ? 'rounded-xl max-w-sm' : 'max-w-[240px]',
              )}
            >
              {searchToggle.components?.lg}
            </div>
          ) : (
            <LargeSearchToggle
              hideIfDisabled
              className={cn(
                'w-full my-auto max-md:hidden',
                navMode === 'top'
                  ? 'rounded-xl max-w-sm ps-2.5'
                  : 'max-w-[240px]',
              )}
            />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end">
          <div className="flex flex-row items-center gap-6 px-4 empty:hidden max-lg:hidden">
            {links
              .filter((item) => item.type !== 'icon')
              .map((item, i) => (
                <NavbarLinkItem
                  key={i}
                  item={item}
                  className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-accent-foreground data-[active=true]:text-fd-primary"
                />
              ))}
          </div>
          {props.nav?.children}
          {searchToggle.enabled !== false &&
            (searchToggle.components?.sm ?? (
              <SearchToggle hideIfDisabled className="p-2 md:hidden" />
            ))}
          <NavbarSidebarTrigger className="p-2 -me-1.5 md:hidden" />
          {links
            .filter((item) => item.type === 'icon')
            .map((item, i) => (
              <BaseLinkItem
                key={i}
                item={item}
                className={cn(
                  buttonVariants({ size: 'icon-sm', color: 'ghost' }),
                  'text-fd-muted-foreground max-lg:hidden',
                )}
                aria-label={item.label}
              >
                {item.icon}
              </BaseLinkItem>
            ))}
          {props.i18n ? (
            <LanguageToggle className="max-md:hidden">
              <Languages className="size-4.5 text-fd-muted-foreground" />
            </LanguageToggle>
          ) : null}
          {themeSwitch.enabled !== false &&
            (themeSwitch.component ?? (
              <ThemeToggle
                className="ms-2 max-md:hidden"
                mode={themeSwitch.mode ?? 'light-dark-system'}
              />
            ))}
          {sidebarCollapsible && navMode === 'top' ? (
            <SidebarCollapseTrigger
              className={cn(
                buttonVariants({
                  color: 'secondary',
                  size: 'icon-sm',
                }),
                'ms-2 text-fd-muted-foreground rounded-full max-md:hidden',
              )}
            >
              <SidebarIcon />
            </SidebarCollapseTrigger>
          ) : null}
        </div>
      </div>
      {tabs.length > 0 && (
        <LayoutTabs
          className={cn(
            'border-b h-10 max-lg:hidden',
            navMode === 'top' ? 'px-4' : 'px-6',
          )}
          options={tabs}
        />
      )}
    </Navbar>
  );
}

function NavbarLinkItem({
  item,
  ...props
}: { item: LinkItemType } & HTMLAttributes<HTMLElement>) {
  if (item.type === 'menu') {
    return (
      <Popover>
        <PopoverTrigger
          {...props}
          className={cn('inline-flex items-center gap-1.5', props.className)}
        >
          {item.text}
          <ChevronDown className="size-3" />
        </PopoverTrigger>
        <PopoverContent className="flex flex-col">
          {item.items.map((child, i) => {
            if (child.type === 'custom')
              return <Fragment key={i}>{child.children}</Fragment>;

            return (
              <BaseLinkItem
                key={i}
                item={child}
                className="inline-flex items-center gap-2 rounded-md p-2 text-start hover:bg-fd-accent hover:text-fd-accent-foreground data-[active=true]:text-fd-primary [&_svg]:size-4"
              >
                {child.icon}
                {child.text}
              </BaseLinkItem>
            );
          })}
        </PopoverContent>
      </Popover>
    );
  }

  if (item.type === 'custom') return item.children;

  return (
    <BaseLinkItem item={item} {...props}>
      {item.text}
    </BaseLinkItem>
  );
}

export { Navbar, NavbarSidebarTrigger };
