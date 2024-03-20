'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import {
  type Options,
  useAlgoliaSearch,
} from 'fumadocs-core/search-algolia/client';
import { type ReactNode } from 'react';
import { SearchDialog, type SharedProps } from './search';

export interface AlgoliaSearchDialogProps extends SharedProps {
  index: SearchIndex;
  searchOptions?: Options;
  footer?: ReactNode;
}

export default function AlgoliaSearchDialog({
  index,
  searchOptions,
  ...props
}: AlgoliaSearchDialogProps): JSX.Element {
  const { search, setSearch, query } = useAlgoliaSearch(index, searchOptions);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      {...props}
    />
  );
}
