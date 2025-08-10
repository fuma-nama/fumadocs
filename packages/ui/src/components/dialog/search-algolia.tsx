'use client';

import {
  type AlgoliaOptions,
  useDocsSearch,
} from 'fumadocs-core/search/client';
import { type ReactNode, useMemo, useState } from 'react';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';
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
import { useI18n } from '@/contexts/i18n';

export interface AlgoliaSearchDialogProps extends SharedProps {
  searchOptions: AlgoliaOptions;
  links?: SearchLink[];

  footer?: ReactNode;

  defaultTag?: string;
  tags?: TagItem[];

  /**
   * Add the "Powered by Algolia" label, this is useful for free tier users
   *
   * @defaultValue false
   */
  showAlgolia?: boolean;

  /**
   * Allow to clear tag filters
   *
   * @defaultValue false
   */
  allowClear?: boolean;
}

export default function AlgoliaSearchDialog({
  searchOptions,
  tags = [],
  defaultTag,
  showAlgolia = false,
  allowClear = false,
  links = [],
  footer,
  ...props
}: AlgoliaSearchDialogProps) {
  const [tag, setTag] = useState(defaultTag);
  const { locale } = useI18n();
  const { search, setSearch, query } = useDocsSearch({
    type: 'algolia',
    tag,
    locale,
    ...searchOptions,
  });
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

  const label = showAlgolia && <AlgoliaTitle />;

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
        {tags.length > 0 ? (
          <TagsList tag={tag} onTagChange={setTag} allowClear={allowClear}>
            {tags.map((tag) => (
              <TagsListItem key={tag.value} value={tag.value}>
                {tag.name}
              </TagsListItem>
            ))}
            {label}
          </TagsList>
        ) : (
          label
        )}
        {footer}
      </SearchDialogFooter>
    </SearchDialog>
  );
}

function AlgoliaTitle() {
  return (
    <a
      href="https://algolia.com"
      rel="noreferrer noopener"
      className="ms-auto text-xs text-fd-muted-foreground"
    >
      Search powered by Algolia
    </a>
  );
}
