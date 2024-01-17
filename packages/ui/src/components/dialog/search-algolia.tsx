'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import {
  type Options,
  useAlgoliaSearch,
} from 'next-docs-zeta/search-algolia/client';
import { type ReactNode } from 'react';
import { SearchDialog, type SharedProps, SearchDialogContent } from './search';

export type AlgoliaSearchDialogProps = ContentProps & SharedProps;

export default function AlgoliaSearchDialog({
  searchOptions,
  index,
  footer,
  ...props
}: AlgoliaSearchDialogProps): JSX.Element {
  return (
    <SearchDialog {...props}>
      <Content index={index} searchOptions={searchOptions} footer={footer} />
    </SearchDialog>
  );
}

interface ContentProps {
  index: SearchIndex;
  searchOptions?: Options;
  footer?: ReactNode;
}

function Content({ index, searchOptions, footer }: ContentProps): JSX.Element {
  const { search, setSearch, query } = useAlgoliaSearch(index, searchOptions);

  return (
    <SearchDialogContent
      search={search}
      onSearchChange={setSearch}
      results={query.data ?? []}
      footer={footer}
    />
  );
}
