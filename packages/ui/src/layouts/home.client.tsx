'use client';

import { ChevronDown, Languages, MoreVertical } from 'lucide-react';
import { useSearchContext } from '@/contexts/search';
import {
  LinkItem,
  type LinkItemType,
  LinksMenu,
} from '@/components/layout/link-item';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NavBox, Title } from '@/components/layout/nav';
import { cn } from '@/utils/cn';
import { buttonVariants } from '@/components/ui/button';
import {
  LanguageToggle,
  LanguageToggleText,
} from '@/components/layout/language-toggle';
import type { SharedNavProps } from './shared';

export function Nav({
  items,
  enableSearch = true,
  ...props
}: SharedNavProps & {
  disableThemeSwitch?: boolean;
  i18n?: boolean;
  items: LinkItemType[];
}): React.ReactElement {
  const search = useSearchContext();

  return (
    <NavBox
      id="nd-nav"
      className="h-14"
      transparentMode={props.transparentMode}
    >
      <nav className="mx-auto flex size-full max-w-fd-container flex-row items-center gap-6 px-4">
        <Title title={props.title} url={props.url} />
        {props.children}
        {items
          .filter((item) => !isSecondary(item))
          .map((item, i) => (
            <LinkItem key={i} item={item} className="text-sm max-sm:hidden" />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end">
          {enableSearch && search.enabled ? (
            <>
              <SearchToggle className="lg:hidden" />
              <LargeSearchToggle className="me-1.5 w-full max-w-[240px] last:me-0 max-lg:hidden" />
            </>
          ) : null}
          {!props.disableThemeSwitch ? (
            <ThemeToggle className="me-1.5 last:me-0 max-lg:hidden" />
          ) : null}
          {props.i18n ? (
            <LanguageToggle className="me-1.5 last:me-0 max-lg:hidden">
              <Languages className="size-5" />
            </LanguageToggle>
          ) : null}

          {items.filter(isSecondary).map((item, i) => (
            <LinkItem key={i} item={item} className="max-lg:hidden" />
          ))}

          <LinksMenu
            items={
              <>
                {items.map((item, i) => (
                  <LinkItem
                    key={i}
                    item={item}
                    on="menu"
                    className={cn(!isSecondary(item) && 'sm:hidden')}
                  />
                ))}
                <div className="flex flex-row items-center gap-1.5 px-2 pt-1.5 empty:hidden">
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
              </>
            }
            className={cn(
              buttonVariants({
                size: 'icon',
                color: 'ghost',
                className: '-me-2 lg:hidden',
              }),
            )}
          >
            <MoreVertical />
          </LinksMenu>
        </div>
      </nav>
    </NavBox>
  );
}

function isSecondary(item: LinkItemType): boolean {
  return (
    ('secondary' in item && item.secondary === true) || item.type === 'icon'
  );
}
