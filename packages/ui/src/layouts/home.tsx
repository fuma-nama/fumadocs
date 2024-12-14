import type { HTMLAttributes } from 'react';
import { replaceOrDefault } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { getLinks, type BaseLayoutProps } from './shared';
import { NavProvider, Title } from '@/components/layout/nav';
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import {
  Navbar,
  NavbarLink,
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuItem,
  NavbarMenuTrigger,
} from '@/layouts/home/navbar';
import { type LinkItemType } from '@/layouts/links';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import { ChevronDown, Languages } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { SearchOnly } from '@/contexts/search';
import Link from 'fumadocs-core/link';
import { MenuLinkItem } from '@/layouts/home/menu';

export type HomeLayoutProps = BaseLayoutProps & HTMLAttributes<HTMLElement>;

export function HomeLayout(props: HomeLayoutProps) {
  const {
    nav,
    links,
    githubUrl,
    i18n: _i18n,
    disableThemeSwitch: _disableThemeSwitch,
    ...rest
  } = props;

  const finalLinks = getLinks(links, githubUrl);

  return (
    <NavProvider transparentMode={nav?.transparentMode}>
      <main
        id="nd-home-layout"
        {...rest}
        className={cn(
          'flex flex-1 flex-col pt-[var(--fd-nav-height)] [--fd-nav-height:56px]',
          rest.className,
        )}
      >
        {replaceOrDefault(
          nav,
          <>
            <div
              aria-hidden="true"
              className="fixed inset-x-0 top-[var(--fd-banner-height)] z-40 h-6 bg-fd-background"
              style={{
                maskImage: 'linear-gradient(to bottom,white,transparent)',
              }}
            />
            <Header finalLinks={finalLinks} {...props} />
          </>,
          {
            items: finalLinks,
          },
        )}
        {props.children}
      </main>
    </NavProvider>
  );
}

function Header({
  nav: { enableSearch = true, ...nav } = {},
  i18n = false,
  finalLinks,
  disableThemeSwitch,
}: BaseLayoutProps & {
  finalLinks: LinkItemType[];
}) {
  const navItems = finalLinks.filter((item) =>
    ['nav', 'all'].includes(item.on ?? 'all'),
  );
  const menuItems = finalLinks.filter((item) =>
    ['menu', 'all'].includes(item.on ?? 'all'),
  );

  return (
    <Navbar>
      <Title title={nav.title} url={nav.url} />
      {nav.children}
      <NavigationMenuList className="flex flex-row items-center gap-2 max-sm:hidden">
        {navItems
          .filter((item) => !isSecondary(item))
          .map((item, i) => (
            <NavbarLinkItem key={i} item={item} className="text-sm" />
          ))}
      </NavigationMenuList>
      <div className="flex flex-1 flex-row items-center justify-end lg:gap-1.5">
        {enableSearch ? (
          <SearchOnly>
            <SearchToggle className="lg:hidden" />
            <LargeSearchToggle className="w-full max-w-[240px] max-lg:hidden" />
          </SearchOnly>
        ) : null}
        {!disableThemeSwitch ? <ThemeToggle className="max-lg:hidden" /> : null}
        {i18n ? (
          <LanguageToggle className="-me-1.5 max-lg:hidden">
            <Languages className="size-5" />
          </LanguageToggle>
        ) : null}
        {navItems.filter(isSecondary).map((item, i) => (
          <NavbarLinkItem
            key={i}
            item={item}
            className="-me-1.5 list-none max-lg:hidden"
          />
        ))}
        <NavigationMenuItem className="list-none lg:hidden">
          <NavigationMenuTrigger
            className={cn(
              buttonVariants({
                size: 'icon',
                color: 'ghost',
              }),
              'group -me-2',
            )}
          >
            <ChevronDown className="size-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </NavigationMenuTrigger>
          <NavigationMenuContent className="flex flex-col p-4 sm:flex-row sm:items-center sm:justify-end">
            {menuItems
              .filter((item) => !isSecondary(item))
              .map((item, i) => (
                <MenuLinkItem key={i} item={item} className="sm:hidden" />
              ))}
            <div className="-ms-1.5 flex flex-row items-center gap-1.5 max-sm:mt-2">
              {menuItems.filter(isSecondary).map((item, i) => (
                <MenuLinkItem key={i} item={item} className="-me-1.5" />
              ))}
              <div role="separator" className="flex-1" />
              {i18n ? (
                <LanguageToggle>
                  <Languages className="size-5" />
                  <LanguageToggleText />
                  <ChevronDown className="size-3 text-fd-muted-foreground" />
                </LanguageToggle>
              ) : null}
              {!disableThemeSwitch ? <ThemeToggle /> : null}
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>
      </div>
    </Navbar>
  );
}

function NavbarLinkItem({
  item,
  ...props
}: {
  item: LinkItemType;
  className?: string;
}) {
  if (item.type === 'custom') return <div {...props}>{item.children}</div>;

  if (item.type === 'menu') {
    const children = item.items.map((child, j) => {
      if (child.type === 'custom') return <div key={j}>{child.children}</div>;

      const { banner, footer, ...rest } = child.menu ?? {};

      return (
        <NavbarMenuItem key={j} href={child.url} {...rest}>
          {banner ??
            (child.icon ? (
              <div className="w-fit rounded-md border bg-fd-muted p-1 [&_svg]:size-4">
                {child.icon}
              </div>
            ) : null)}
          <p className="-mb-1 text-sm font-medium">{child.text}</p>
          {child.description ? (
            <p className="text-[13px] text-fd-muted-foreground">
              {child.description}
            </p>
          ) : null}
          {footer}
        </NavbarMenuItem>
      );
    });

    return (
      <NavbarMenu>
        <NavbarMenuTrigger {...props}>
          {item.url ? <Link href={item.url}>{item.text}</Link> : item.text}
        </NavbarMenuTrigger>
        <NavbarMenuContent>{children}</NavbarMenuContent>
      </NavbarMenu>
    );
  }

  return (
    <NavbarLink
      {...props}
      item={item}
      variant={item.type}
      aria-label={item.type === 'icon' ? item.label : undefined}
    >
      {item.type === 'icon' ? item.icon : item.text}
    </NavbarLink>
  );
}

function isSecondary(item: LinkItemType): boolean {
  return (
    ('secondary' in item && item.secondary === true) || item.type === 'icon'
  );
}
