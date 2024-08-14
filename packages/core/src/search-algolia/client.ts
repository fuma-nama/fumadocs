import type {
  LiteClient,
  SearchResult,
  SearchQuery,
  SearchForHits,
} from 'algoliasearch/lite';
import { useState } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import type { SortedResult } from '@/search/shared';
import { useDebounce } from '@/utils/use-debounce';
import type { BaseIndex } from './server';

type SearchOptions = SearchForHits;

export interface Options extends SearchOptions {
  /**
   * Use `empty` as result if query is empty
   *
   * @defaultValue true
   */
  allowEmpty?: boolean;

  /**
   * Delay to debounce (in ms)
   *
   * @defaultValue 300
   */
  delay?: number;
}

export function groupResults(result: SearchResult<BaseIndex>): SortedResult[] {
  const grouped: SortedResult[] = [];
  const scannedUrls = new Set<string>();
  if (!('hits' in result)) {
    return [];
  }

  for (const hit of result.hits) {
    if (!scannedUrls.has(hit.url)) {
      scannedUrls.add(hit.url);

      grouped.push({
        id: hit.url,
        type: 'page',
        url: hit.url,
        content: hit.title,
      });
    }

    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.section_id ? `${hit.url}#${hit.section_id}` : hit.url,
      content: hit.content,
    });
  }

  return grouped;
}

export async function searchDocs(
  client: LiteClient,
  query: string,
  options: SearchOptions,
): Promise<SortedResult[]> {
  if (query.length === 0) {
    const result = await client.search<BaseIndex>({
      requests: [
        {
          query,
          distinct: 1,
          hitsPerPage: 8,
          ...(options as SearchQuery),
        },
      ],
    });

    return groupResults(result.results[0]).filter((hit) => hit.type === 'page');
  }

  const result = await client.search<BaseIndex>({
    requests: [
      {
        query,
        distinct: 5,
        hitsPerPage: 10,
        ...(options as SearchQuery),
      },
    ],
  });

  return groupResults(result.results[0]);
}

interface UseAlgoliaSearch {
  search: string;
  setSearch: (v: string) => void;
  query: SWRResponse<
    SortedResult[] | 'empty',
    Error,
    { keepPreviousData: true }
  >;
}

export function useAlgoliaSearch(
  client: LiteClient,
  { allowEmpty = true, delay = 150, ...options }: Options,
): UseAlgoliaSearch {
  const [search, setSearch] = useState('');
  const debouncedValue = useDebounce(search, delay);

  const query: UseAlgoliaSearch['query'] = useSWR(
    ['algolia-search', debouncedValue, allowEmpty, options],
    async () => {
      if (allowEmpty && debouncedValue.length === 0) return 'empty';

      return searchDocs(client, debouncedValue, options);
    },
    {
      keepPreviousData: true,
    },
  );

  return { search, setSearch, query };
}
