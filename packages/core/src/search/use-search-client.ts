import { type DependencyList, useEffect, useEffectEvent, useState } from 'react';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';
import { isEqualShallow } from '@/utils/is-equal';

export interface SearchClient {
  search: (query: string) => Awaitable<SortedResult[]>;
  /**
   * search again when changed
   */
  deps?: DependencyList;
}

/**
 * Options of search hooks
 */
export interface UseSearchOptions {
  /**
   * The debounced delay for performing a search (in ms).
   *
   * @defaultValue 100
   */
  delayMs?: number;

  /**
   * still perform search even if query is empty.
   *
   * @defaultValue false
   */
  allowEmpty?: boolean;
}

export interface SearchResult {
  /**
   * the query searched for `data`
   */
  query: string;
  /**
   * `undefined` when nothing is searched, or the search failed
   */
  data?: SortedResult[];
  error?: Error;
}

/**
 * Returned by search hooks
 */
export interface UseSearchReturn {
  search: string;
  setSearch: (search: string) => void;
  isLoading: boolean;
  /**
   * the last completed search
   */
  result: SearchResult;
}

const empty: SearchResult = { query: '' };

/**
 * Search with a search client, the base of search hooks.
 */
export function useSearchClient(
  client: SearchClient,
  { delayMs = 100, allowEmpty = false }: UseSearchOptions = {},
): UseSearchReturn {
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(empty);
  const [isLoading, setIsLoading] = useState(false);
  const [deps, setDeps] = useState(client.deps);
  if (!isEqualShallow(deps, client.deps)) setDeps(client.deps);
  const onSearch = useEffectEvent((query: string) => client.search(query));

  useEffect(() => {
    if (search.length === 0 && !allowEmpty) {
      setResult(empty);
      setIsLoading(false);
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      const next: SearchResult = { query: search };
      try {
        next.data = await onSearch(search);
      } catch (error) {
        next.error = error as Error;
      }

      if (!active) return;
      setResult(next);
      setIsLoading(false);
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, allowEmpty, delayMs, deps]);

  return { search, setSearch, isLoading, result };
}
