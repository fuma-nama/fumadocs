import { useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import type { SortedResult } from '@/server/types';
import { fetchDocs } from '@/search/client/fetch';
import { useOnChange } from '@/utils/use-on-change';

interface UseDocsSearch {
  search: string;
  setSearch: (v: string) => void;
  query: {
    isLoading: boolean;
    data?: SortedResult[] | 'empty';
    error?: Error;
  };
}

const cache = new Map<string, SortedResult[] | 'empty'>();

/**
 * @param locale - Filter with locale
 * @param tag - Filter with specific tag
 * @param api - The Search API URL
 * @param delayMs - The debounced delay for performing a search.
 */
export function useDocsSearch(
  locale?: string,
  tag?: string,
  api = '/api/search',
  delayMs = 100,
): UseDocsSearch {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);
  const onStart = useRef<() => void>();

  useOnChange(debouncedValue, () => {
    if (onStart.current) onStart.current();

    const cached = cache.get(debouncedValue);
    if (cached) {
      setError(undefined);
      setResults(cached);
      return;
    }

    setIsLoading(true);
    let interrupt = false;
    onStart.current = () => {
      interrupt = true;
    };

    void fetchDocs(api, debouncedValue, locale, tag)
      .then((res) => {
        cache.set(debouncedValue, res);
        if (interrupt) return;

        setError(undefined);
        setResults(res);
      })
      .catch((err: unknown) => {
        setError(err as Error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  });

  return { search, setSearch, query: { isLoading, data: results, error } };
}
