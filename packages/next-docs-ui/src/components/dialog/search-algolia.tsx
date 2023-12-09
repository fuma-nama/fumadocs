'use client'

import type { SearchOptions } from '@algolia/client-search'
import type { SearchIndex } from 'algoliasearch/lite'
import { useAlgoliaSearch } from 'next-docs-zeta/search-algolia/client'
import { createContext, useContext, type ReactNode } from 'react'
import { SearchDialog, type SharedProps } from './search'

export type AlgoliaSearchDialogProps = SharedProps & {
  searchOptions?: SearchOptions
  footer?: ReactNode
  children?: ReactNode
}

const Context = createContext<SearchIndex | null>(null)

export function AlgoliaContextProvider(props: {
  index: SearchIndex
  children: ReactNode
}) {
  return (
    <Context.Provider value={props.index}>{props.children}</Context.Provider>
  )
}

export default function AlgoliaSearchDialog({
  searchOptions,
  ...props
}: AlgoliaSearchDialogProps) {
  const index = useContext(Context)
  if (index == null) throw new Error('Missing algolia index context')

  const { search, setSearch, query } = useAlgoliaSearch(index, searchOptions)

  return (
    <SearchDialog
      search={search}
      onSearchChange={setSearch}
      data={query.data}
      {...props}
    />
  )
}
