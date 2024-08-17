import type { Hit, SearchOptions } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch/lite';
import { useState } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import type { SortedResult } from '@/search/shared';
import { useDebounce } from '@/utils/use-debounce';
import type { BaseIndex } from './server';

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

export function groupResults(hits: Hit<BaseIndex>[]): SortedResult[] {
  const grouped: SortedResult[] = [];
  const scannedUrls = new Set<string>();

  for (const hit of hits) {
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
  index: SearchIndex,
  query: string,
  options?: SearchOptions,
): Promise<SortedResult[]> {
  if (query.length === 0) {
    const result = await index.search<BaseIndex>(query, {
      distinct: 1,
      hitsPerPage: 8,
      ...options,
    });

    return groupResults(result.hits).filter((hit) => hit.type === 'page');
  }

  const result = await index.search<BaseIndex>(query, {
    distinct: 5,
    hitsPerPage: 10,
    ...options,
  });

  return groupResults(result.hits);
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
  index: SearchIndex,
  { allowEmpty = true, delay = 150, ...options }: Options = {},
): UseAlgoliaSearch {
  const [search, setSearch] = useState('');
  const debouncedValue = useDebounce(search, delay);

  const query: UseAlgoliaSearch['query'] = useSWR(
    ['algolia-search', debouncedValue, allowEmpty, options],
    async () => {
      if (allowEmpty && debouncedValue.length === 0) return 'empty';

      return searchDocs(index, debouncedValue, options);
    },
    {
      keepPreviousData: true,
    },
  );

  return { search, setSearch, query };
}
