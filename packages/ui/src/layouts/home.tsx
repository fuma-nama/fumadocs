import type { HTMLAttributes } from 'react';
import { type NavOptions, replaceOrDefault } from '@/layouts/shared';
import { cn } from '@/utils/cn';
import { getLinks, type BaseLayoutProps } from './shared';
import { NavProvider, Title } from '@/components/layout/nav';
import { NavigationMenuList } from '@/components/ui/navigation-menu';
import {
  Navbar,
  NavbarLink,
  NavbarMenu,
  NavbarMenuContent,
  NavbarMenuLink,
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
import { SearchOnly } from '@/contexts/search';
import Link from 'fumadocs-core/link';
import {
  Menu,
  MenuContent,
  MenuLinkItem,
  MenuTrigger,
} from '@/layouts/home/menu';

export interface HomeLayoutProps
  extends BaseLayoutProps,
    HTMLAttributes<HTMLElement> {
  nav?: Partial<
    NavOptions & {
      /**
       * Open mobile menu when hovering the trigger
       */
      enableHoverToOpen?: boolean;
    }
  >;
}

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
        className={cn('flex flex-1 flex-col pt-14', rest.className)}
      >
        {replaceOrDefault(nav, <Header finalLinks={finalLinks} {...props} />, {
          items: finalLinks,
        })}
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
}: HomeLayoutProps & {
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
            className="-me-1.5 max-lg:hidden"
          />
        ))}
        <Menu className="lg:hidden">
          <MenuTrigger
            className="group -me-2"
            enableHover={nav.enableHoverToOpen}
          >
            <ChevronDown className="size-3 transition-transform duration-300 group-data-[state=open]:rotate-180" />
          </MenuTrigger>
          <MenuContent className="sm:flex-row sm:items-center sm:justify-end">
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
          </MenuContent>
        </Menu>
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
        <NavbarMenuLink key={j} href={child.url} {...rest}>
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
        </NavbarMenuLink>
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
