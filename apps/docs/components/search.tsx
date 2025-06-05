'use client';

import { OramaClient } from '@oramacloud/client';
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
} from 'fumadocs-ui/components/dialog/search';
import { useDocsSearch } from 'fumadocs-core/search/client';
import { useState } from 'react';
import { useMode } from '@/app/layout.client';
import { useOnChange } from 'fumadocs-core/utils/use-on-change';

const client = new OramaClient({
  endpoint: 'https://cloud.orama.run/v1/indexes/docs-fk97oe',
  api_key: 'oPZjdlFbq5BpR54bV5Vj57RYt83Xosk7',
});

export default function CustomSearchDialog(props: SharedProps) {
  const mode = useMode();
  const [tag, setTag] = useState<string | undefined>(mode);
  const { search, setSearch, query } = useDocsSearch({
    type: 'orama-cloud',
    client,
    tag,
  });

  useOnChange(mode, () => {
    if (mode) setTag(mode);
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
        {query.data !== 'empty' && query.data && (
          <SearchDialogList items={query.data} />
        )}
        <SearchDialogFooter className="flex flex-row">
          <TagsList tag={tag} onTagChange={setTag} allowClear>
            <TagsListItem value="ui">Framework</TagsListItem>
            <TagsListItem value="headless">Core</TagsListItem>
            <TagsListItem value="mdx">MDX</TagsListItem>
            <TagsListItem value="cli">CLI</TagsListItem>
          </TagsList>
          <a
            href="https://orama.com"
            rel="noreferrer noopener"
            className="ms-auto text-xs text-fd-muted-foreground"
          >
            Search powered by Orama
          </a>
        </SearchDialogFooter>
      </SearchDialogContent>
    </SearchDialog>
  );
}
