'use client';

import {
  type OramaCloudOptions,
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
  SearchDialogInput,
  SearchDialogInputIcon,
  SearchDialogList,
  SearchDialogOverlay,
  TagsList,
  TagsListItem,
} from './search';
import type { SortedResult } from 'fumadocs-core/server';
import type { SearchLink, SharedProps, TagItem } from '@/contexts/search';

export interface OramaSearchDialogProps extends SharedProps {
  links?: SearchLink[];
  client: OramaCloudOptions['client'];
  searchOptions?: OramaCloudOptions['params'];
  index?: OramaCloudOptions['index'];

  footer?: ReactNode;

  defaultTag?: string;
  tags?: TagItem[];

  /**
   * Add the "Powered by Orama" label
   *
   * @defaultValue false
   */
  showOrama?: boolean;

  /**
   * Allow to clear tag filters
   *
   * @defaultValue false
   */
  allowClear?: boolean;
}

/**
 * Orama Cloud integration
 */
export default function OramaSearchDialog({
  client,
  searchOptions,
  tags = [],
  defaultTag,
  showOrama = false,
  allowClear = false,
  index,
  footer,
  links = [],
  ...props
}: OramaSearchDialogProps): ReactNode {
  const [tag, setTag] = useState(defaultTag);
  const { search, setSearch, query } = useDocsSearch(
    {
      type: 'orama-cloud',
      client,
      index,
      params: searchOptions,
    },
    undefined,
    tag,
  );

  const defaultItems = useMemo<SortedResult[]>(
    () =>
      links.map(([name, link]) => ({
        type: 'page',
        id: name,
        content: name,
        url: link,
      })),
    [links],
  );

  useOnChange(defaultTag, (v) => {
    setTag(v);
  });

  const label = showOrama && <Label />;

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
          <SearchDialogInputIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        {query.data !== 'empty' && query.data && (
          <SearchDialogList items={query.data} />
        )}
        {query.data === 'empty' && defaultItems.length > 0 && (
          <SearchDialogList items={defaultItems} />
        )}
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
      </SearchDialogContent>
    </SearchDialog>
  );
}

function Label() {
  return (
    <a
      href="https://orama.com"
      rel="noreferrer noopener"
      className="ms-auto text-xs text-fd-muted-foreground"
    >
      Search powered by Orama
    </a>
  );
}
