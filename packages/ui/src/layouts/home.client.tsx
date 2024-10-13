'use client';

import { ChevronDown, Languages } from 'lucide-react';
import { type ReactNode, useContext, useMemo, useState } from 'react';
import { useSearchContext } from '@/contexts/search';
import { type LinkItemType } from '@/layouts/links';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NavContext, Title } from '@/components/layout/nav';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import { NavItem, MenuItem } from '@/layouts/nav-item';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu';
import type { SharedNavProps } from './shared';

export function Nav({
  items,
  enableSearch = true,
  ...props
}: Omit<SharedNavProps, 'transparentMode'> & {
  disableThemeSwitch?: boolean;
  i18n?: boolean;
  items: LinkItemType[];
}): ReactNode {
  const search = useSearchContext();
  const [navItems, menuItems] = useMemo(
    () => [
      items.filter((item) => ['nav', 'all'].includes(item.on ?? 'all')),
      items.filter((item) => ['menu', 'all'].includes(item.on ?? 'all')),
    ],
    [items],
  );

  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-x-0 top-[var(--fd-banner-height)] z-40 h-6 bg-fd-background"
        style={{
          maskImage: 'linear-gradient(to bottom,white,transparent)',
        }}
      />
      <Header>
        <Title title={props.title} url={props.url} />
        {props.children}
        <NavigationMenuList className="flex flex-row items-center gap-2 max-sm:hidden">
          {navItems
            .filter((item) => !isSecondary(item))
            .map((item, i) => (
              <NavItem key={i} item={item} className="text-sm" />
            ))}
        </NavigationMenuList>

        <div className="flex flex-1 flex-row items-center justify-end lg:gap-1.5">
          {enableSearch && search.enabled ? (
            <>
              <SearchToggle className="lg:hidden" />
              <LargeSearchToggle className="w-full max-w-[240px] max-lg:hidden" />
            </>
          ) : null}
          {!props.disableThemeSwitch ? (
            <ThemeToggle className="max-lg:hidden" />
          ) : null}
          {props.i18n ? (
            <LanguageToggle className="-me-1.5 max-lg:hidden">
              <Languages className="size-5" />
            </LanguageToggle>
          ) : null}

          {navItems.filter(isSecondary).map((item, i) => (
            <NavItem
              item={item}
              key={i}
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
                  <MenuItem key={i} item={item} className="sm:hidden" />
                ))}
              <div className="-ms-1.5 flex flex-row items-center gap-1.5 max-sm:mt-2">
                {props.i18n ? (
                  <LanguageToggle className="me-auto">
                    <Languages className="size-5" />
                    <LanguageToggleText />
                    <ChevronDown className="size-3 text-fd-muted-foreground" />
                  </LanguageToggle>
                ) : null}
                <div className="flex flex-row items-center empty:hidden">
                  {menuItems.filter(isSecondary).map((item, i) => (
                    <NavItem key={i} item={item} className="list-none" />
                  ))}
                </div>
                {!props.disableThemeSwitch ? (
                  <ThemeToggle className={cn(!props.i18n && 'ms-auto')} />
                ) : null}
              </div>
            </NavigationMenuContent>
          </NavigationMenuItem>
        </div>
      </Header>
    </>
  );
}

function Header({ children }: { children: ReactNode }): ReactNode {
  const [value, setValue] = useState('');
  const { isTransparent } = useContext(NavContext);

  return (
    <NavigationMenu value={value} onValueChange={setValue} asChild>
      <header
        id="nd-nav"
        className={cn(
          'fixed left-1/2 top-[var(--fd-banner-height)] z-40 mt-1 w-[calc(100%-1rem)] max-w-fd-container -translate-x-1/2 rounded-2xl border border-fd-foreground/10 transition-colors',
          value.length > 0 ? 'shadow-lg' : 'shadow-sm',
          (!isTransparent || value.length > 0) &&
            'bg-fd-background/80 backdrop-blur-lg',
        )}
      >
        <nav className="flex h-12 w-full flex-row items-center gap-6 px-4">
          {children}
        </nav>
        <NavigationMenuViewport />
      </header>
    </NavigationMenu>
  );
}

function isSecondary(item: LinkItemType): boolean {
  return (
    ('secondary' in item && item.secondary === true) || item.type === 'icon'
  );
}

export { NavProvider } from '@/components/layout/nav';
