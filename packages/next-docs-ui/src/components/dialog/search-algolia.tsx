'use client'

import type { SearchIndex } from 'algoliasearch/lite'
import { useAlgoliaSearch } from 'next-docs-zeta/search-algolia'
import dynamic from 'next/dynamic'
import { createContext, useContext, type ReactNode } from 'react'
import { type SharedProps } from './search'

const SearchDialog = dynamic(() =>
  import('./search').then(res => res.SearchDialog)
)

export type AlgoliaSearchDialogProps = SharedProps & {
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

export default function AlgoliaSearchDialog_experimental(
  props: AlgoliaSearchDialogProps
) {
  const index = useContext(Context)
  if (index == null) throw new Error('Missing algolia index context')

  const { search, setSearch, query } = useAlgoliaSearch(index)

  return (
    <SearchDialog
      {...props}
      search={search}
      onSearchChange={setSearch}
      data={query.data}
    />
  )
}
