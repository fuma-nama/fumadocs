'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import {
  type Options,
  useAlgoliaSearch,
} from 'fumadocs-core/search-algolia/client';
import { type ReactNode } from 'react';
import {
  SearchDialog,
  SearchDialogContent,
  type SharedProps,
  type SearchLink,
} from './search';

export type AlgoliaSearchDialogProps = ContentProps & SharedProps;

interface ContentProps {
  index: SearchIndex;
  searchOptions?: Options;
  footer?: ReactNode;
  links?: SearchLink[];
}

export default function AlgoliaSearchDialog({
  open,
  onOpenChange,
  ...props
}: AlgoliaSearchDialogProps): JSX.Element {
  return (
    <SearchDialog open={open} onOpenChange={onOpenChange}>
      <Content {...props} />
    </SearchDialog>
  );
}

function Content({
  index,
  searchOptions,
  ...props
}: ContentProps): JSX.Element {
  const { search, setSearch, query } = useAlgoliaSearch(index, searchOptions);

  return (
    <SearchDialogContent
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
    />
  );
}
