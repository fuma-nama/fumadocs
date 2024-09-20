'use client';

import { MoreVertical } from 'lucide-react';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
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
import { LanguageToggle } from '@/components/layout/language-toggle';
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
  const { text } = useI18n();

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
            <LinkItem key={i} item={item} className="text-sm max-lg:hidden" />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
          {enableSearch && search.enabled ? (
            <>
              <SearchToggle className="sm:hidden" />
              <LargeSearchToggle className="w-full max-w-[240px] max-sm:hidden" />
            </>
          ) : null}

          <ThemeToggle className="max-lg:hidden" />
          {items.filter(isSecondary).map((item, i) => (
            <LinkItem key={i} item={item} className="max-lg:hidden" />
          ))}

          <LinksMenu
            items={items}
            className={cn(
              buttonVariants({
                size: 'icon',
                color: 'ghost',
                className: '-me-2 lg:hidden',
              }),
            )}
            footer={
              <>
                {!props.disableThemeSwitch ? (
                  <div className="flex flex-row items-center justify-between px-2 pt-2">
                    <p className="font-medium text-fd-muted-foreground">
                      {text.chooseTheme}
                    </p>
                    <ThemeToggle />
                  </div>
                ) : null}
                {props.i18n ? (
                  <div className="flex flex-row items-center justify-between px-2 pt-2">
                    <p className="font-medium text-fd-muted-foreground">
                      {text.chooseLanguage}
                    </p>
                    <LanguageToggle />
                  </div>
                ) : null}
              </>
            }
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
