'use client';

import { SearchClient, useDocsSearch } from 'fumadocs-core/search/client';
import { fetchClient } from 'fumadocs-core/search/client/fetch';
import { type ReactNode, use, useMemo, useState } from 'react';
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
  type SharedProps,
  TagsList,
  TagsListItem,
} from './search';
import type { SortedResult } from 'fumadocs-core/search';
import type { SearchLink, TagItem } from '@/contexts/search';

export interface DefaultSearchDialogProps extends SharedProps {
  /** @deprecated re-create the dialog instead for other clients, see https://fumadocs.dev/docs/search/orama */
  type?: 'static';

  links?: SearchLink[];
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

let STATIC: Promise<typeof import('fumadocs-core/search/client/orama-static')> | undefined;

export default function DefaultSearchDialog({
  type,
  defaultTag,
  tags = [],
  api,
  delayMs,
  allowClear = false,
  links = [],
  footer,
  ...props
}: DefaultSearchDialogProps) {
  const { locale } = useI18n();
  const [tag, setTag] = useState(defaultTag);
  let client: SearchClient;

  if (type === 'static') {
    // TODO: must remove it on next major, currently, this will bundle the Orama client unnecessarily

    client = use((STATIC ??= import('fumadocs-core/search/client/orama-static'))).oramaStaticClient(
      {
        from: api,
        locale,
        tag,
      },
    );
  } else {
    client = fetchClient({
      api,
      locale,
      tag,
    });
  }

  const { search, setSearch, query } = useDocsSearch({ client, delayMs });
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
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== 'empty' ? query.data : defaultItems} />
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
