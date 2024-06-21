'use client';

import { MoreVertical } from 'lucide-react';
import type { LinkItemType, SharedNavProps } from '@/layout';
import { useSearchContext } from '@/contexts/search';
import { useI18n } from '@/contexts/i18n';
import { LinkItem } from '@/components/layout/link-item';
import {
  LargeSearchToggle,
  SearchToggle,
} from '@/components/layout/search-toggle';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LinksMenu } from '@/components/layout/links-menu';
import { NavBox, Title } from '@/components/layout/nav';

export function Nav({
  title,
  url,
  items,
  transparentMode,
  enableSearch = true,
  children,
}: SharedNavProps & { items: LinkItemType[] }): React.ReactElement {
  const search = useSearchContext();
  const { text } = useI18n();

  return (
    <NavBox id="nd-nav" className="h-16" transparentMode={transparentMode}>
      <nav className="mx-auto flex size-full max-w-container flex-row items-center gap-6 px-4">
        <Title title={title} url={url} />
        {children}
        {items
          .filter((item) => item.type !== 'secondary')
          .map((item, i) => (
            <LinkItem
              key={i}
              item={item}
              className="-mx-2 text-sm max-lg:hidden"
            />
          ))}
        <div className="flex flex-1 flex-row items-center justify-end md:gap-2">
          {enableSearch && search.enabled ? (
            <>
              <SearchToggle className="md:hidden" />
              <LargeSearchToggle className="w-full max-w-[240px] max-md:hidden" />
            </>
          ) : null}

          <ThemeToggle className="max-lg:hidden" />
          {items
            .filter((item) => item.type === 'secondary')
            .map((item, i) => (
              <LinkItem key={i} item={item} className="max-lg:hidden" />
            ))}

          <LinksMenu
            items={items}
            className="-me-2 lg:hidden"
            footer={
              <div className="flex flex-row items-center justify-between px-2 pt-2">
                <p className="font-medium text-muted-foreground">
                  {text.chooseTheme}
                </p>
                <ThemeToggle />
              </div>
            }
          >
            <MoreVertical />
          </LinksMenu>
        </div>
      </nav>
    </NavBox>
  );
}
