import type { BaseIndex } from '@/algolia'
import type { SortedResult } from '@/server/flexsearch-api'
import type { Hit, SearchOptions } from '@algolia/client-search'
import type { SearchIndex } from 'algoliasearch/lite'
import { useState } from 'react'
import useSWR from 'swr'

export function groupResults(hits: Hit<BaseIndex>[]): SortedResult[] {
  const grouped: SortedResult[] = []
  const scanned_urls = new Set<string>()

  for (const hit of hits) {
    if (!scanned_urls.has(hit.url)) {
      scanned_urls.add(hit.url)

      grouped.push({
        id: hit.url,
        type: 'page',
        url: hit.url,
        content: hit.title
      })
    }

    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.section_id ? hit.url + '#' + hit.section_id : hit.url,
      content: hit.content
    })
  }

  return grouped
}

export async function searchDocs(
  index: SearchIndex,
  query: string,
  options?: SearchOptions
): Promise<SortedResult[]> {
  const result = await index.search<BaseIndex>(query, {
    distinct: 5,
    hitsPerPage: 10,
    ...options
  })

  return groupResults(result.hits)
}

export function useAlgoliaSearch(index: SearchIndex, options?: SearchOptions) {
  const [search, setSearch] = useState('')

  const query = useSWR(
    ['search', search, options],
    async ([, query, options]) => {
      if (query.length === 0) return 'empty'

      return searchDocs(index, query, options)
    },
    {
      keepPreviousData: true
    }
  )

  return { search, setSearch, query }
}
