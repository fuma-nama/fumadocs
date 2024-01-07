'use client';

import type { SearchIndex } from 'algoliasearch/lite';
import {
  type Options,
  useAlgoliaSearch,
} from 'next-docs-zeta/search-algolia/client';
import { createContext, useContext, type ReactNode } from 'react';
import { SearchDialog, type SharedProps } from './search';

export type AlgoliaSearchDialogProps = SharedProps & {
  searchOptions?: Options;
  footer?: ReactNode;
  children?: ReactNode;
};

const Context = createContext<SearchIndex | null>(null);

export function AlgoliaContextProvider(props: {
  index: SearchIndex;
  children: ReactNode;
}): JSX.Element {
  return (
    <Context.Provider value={props.index}>{props.children}</Context.Provider>
  );
}

export default function AlgoliaSearchDialog({
  searchOptions,
  ...props
}: AlgoliaSearchDialogProps): JSX.Element {
  const index = useContext(Context);
  if (!index) throw new Error('Missing algolia index context');

  const { search, setSearch, query } = useAlgoliaSearch(index, searchOptions);

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      data={query.data}
      {...props}
    />
  );
}
