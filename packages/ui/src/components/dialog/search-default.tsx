'use client';

import { useDocsSearch } from 'fumadocs-core/search/client';
import { type ReactNode, useMemo, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
import { useI18n } from '@/contexts/i18n';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogFooter,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
  type SharedProps,
} from './search';
import type { SortedResult } from 'fumadocs-core/server';
import type { SearchLink, TagItem } from '@/contexts/search';

export interface DefaultSearchDialogProps extends SharedProps {
  links?: SearchLink[];

  /**
   * @defaultValue 'fetch'
   */
  type?: 'fetch' | 'static';

  defaultTag?: string;
  tags?: TagItem[];

  /**
   * Search API URL
   */
  api?: string;

  /**
   * The debounced delay for performing a search.
   */
  delayMs?: number;

  footer?: ReactNode;

  /**
   * Allow to clear tag filters
   *
   * @defaultValue false
   */
  allowClear?: boolean;
}

export default function DefaultSearchDialog({
  defaultTag,
  tags = [],
  api,
  delayMs,
  type = 'fetch',
  allowClear = false,
  links = [],
  footer,
  ...props
}: DefaultSearchDialogProps) {
  const { locale } = useI18n();
  const [tag, setTag] = useState(defaultTag);
  const { search, setSearch, query } = useDocsSearch(
    type === 'fetch'
      ? {
          type: 'fetch',
          api,
          locale,
          tag,
          delayMs,
        }
      : {
          type: 'static',
          from: api,
          locale,
          tag,
          delayMs,
        },
  );
  const defaultItems = useMemo<SortedResult[] | null>(() => {
    if (links.length === 0) return null;
    return links.map(([name, link]) => ({
      type: 'page',
      id: name,
      content: name,
      url: link,
    }));
  }, [links]);

  useOnChange(defaultTag, (v) => {
    setTag(v);
  });

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      {...props}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList
          items={query.data !== 'empty' ? query.data : defaultItems}
        />
      </SearchDialogContent>
      <SearchDialogFooter>
        {tags.length > 0 && (
          <TagsList tag={tag} onTagChange={setTag} allowClear={allowClear}>
            {tags.map((tag) => (
              <TagsListItem key={tag.value} value={tag.value}>
                {tag.name}
              </TagsListItem>
            ))}
          </TagsList>
        )}
        {footer}
      </SearchDialogFooter>
    </SearchDialog>
  );
}
