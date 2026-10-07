import { useEffect, useState } from 'react';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';

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
  /** the query searched for `data` */
  query: string;
  /** `undefined` when nothing is searched, or the search failed */
  data?: SortedResult[];
  error?: Error;
}

export interface UseSearchReturn {
  search: string;
  onSearchChange: (search: string) => void;
  isLoading: boolean;
  /** the last completed search */
  result: SearchResult;
}

const idle: { result: SearchResult; run?: unknown } = { result: { query: '' } };

/**
 * The base of search hooks.
 *
 * @param run - memoized search function, search again when changed
 */
export function useSearch(
  run: (query: string) => Awaitable<SortedResult[]>,
  { delayMs = 100, allowEmpty = false }: UseSearchOptions = {},
): UseSearchReturn {
  const [search, setSearch] = useState('');
  const [done, setDone] = useState(idle);
  const empty = search.length === 0 && !allowEmpty;
  if (empty && done !== idle) setDone(idle);

  useEffect(() => {
    if (empty) return;

    let active = true;
    const timer = setTimeout(async () => {
      const result: SearchResult = { query: search };
      try {
        result.data = await run(search);
      } catch (error) {
        result.error = error as Error;
      }

      if (active) setDone({ result, run });
    }, delayMs);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [search, empty, delayMs, run]);

  return {
    search,
    onSearchChange: setSearch,
    isLoading: !empty && (done.result.query !== search || done.run !== run),
    result: done.result,
  };
}
