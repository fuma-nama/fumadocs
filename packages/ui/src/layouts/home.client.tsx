'use client';

import { ChevronDown, Languages } from 'lucide-react';
import { useContext, useMemo, useState } from 'react';
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
import { renderNavItem, renderMenuItem } from '@/layouts/nav-item';
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
}): React.ReactElement {
  const [value, setValue] = useState('');
  const { isTransparent } = useContext(NavContext);
  const search = useSearchContext();
  const [navItems, menuItems] = useMemo(
    () => [
      items.filter((item) => ['nav', 'all'].includes(item.on ?? 'all')),
      items.filter((item) => ['menu', 'all'].includes(item.on ?? 'all')),
    ],
    [items],
  );

  return (
    <NavigationMenu value={value} onValueChange={setValue} asChild>
      <header
        id="nd-nav"
        className={cn(
          'fixed left-1/2 top-[var(--fd-banner-height)] z-40 mt-1 w-[calc(100%-1rem)] max-w-fd-container -translate-x-1/2 rounded-2xl border border-fd-foreground/10 px-4 transition-colors',
          value.length > 0 ? 'shadow-lg' : 'shadow-sm',
          (!isTransparent || value.length > 0) &&
            'bg-fd-background/80 backdrop-blur-md',
        )}
      >
        <nav className="flex h-12 w-full flex-row items-center gap-4">
          <Title title={props.title} url={props.url} />
          {props.children}
          <NavigationMenuList className="flex flex-row items-center gap-2 max-sm:hidden">
            {navItems
              .filter((item) => !isSecondary(item))
              .map((item, i) =>
                renderNavItem({
                  key: i,
                  item,
                  className: 'text-sm',
                }),
              )}
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
              <LanguageToggle className="max-lg:hidden">
                <Languages className="size-5" />
              </LanguageToggle>
            ) : null}

            {navItems.filter(isSecondary).map((item, i) =>
              renderNavItem({
                key: i,
                item,
                className: '-me-1.5 list-none max-lg:hidden',
              }),
            )}

            <NavigationMenuItem className="list-none lg:hidden">
              <NavigationMenuTrigger
                className={cn(
                  buttonVariants({
                    size: 'icon',
                    color: 'ghost',
                    className: '-me-2',
                  }),
                )}
              />
              <NavigationMenuContent className="flex flex-col pb-4 sm:flex-row sm:items-center sm:justify-end">
                {menuItems.map((item, i) =>
                  renderMenuItem({
                    key: i,
                    item,
                    className: cn(
                      !isSecondary(item) ? 'sm:hidden' : 'sm:w-fit',
                    ),
                  }),
                )}
                <div className="flex flex-row items-center gap-1.5 empty:hidden max-sm:mt-1.5 sm:ms-1.5">
                  {props.i18n ? (
                    <LanguageToggle className="-ms-1.5">
                      <Languages className="size-5" />
                      <LanguageToggleText />
                      <ChevronDown className="size-3 text-fd-muted-foreground" />
                    </LanguageToggle>
                  ) : null}
                  {!props.disableThemeSwitch ? (
                    <ThemeToggle className="ms-auto" />
                  ) : null}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </div>
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
