import { useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import type { SortedResult } from '@/server/types';
import { type FetchOptions } from '@/search/client/fetch';
import { useOnChange } from '@/utils/use-on-change';
import { type StaticClient, type StaticOptions } from '@/search/client/static';
import { type AlgoliaOptions } from '@/search/client/algolia';
import { type OramaCloudOptions } from '@/search/client/orama-cloud';

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

type Client =
  | ({
      type: 'fetch';
    } & FetchOptions)
  | ({
      type: 'static';
    } & StaticOptions)
  | ({
      type: 'algolia';
    } & AlgoliaOptions)
  | ({
      type: 'orama-cloud';
    } & OramaCloudOptions);

let staticClient: StaticClient | undefined;

/**
 * @param client - search client
 * @param locale - Filter with locale
 * @param tag - Filter with specific tag
 * @param delayMs - The debounced delay for performing a search.
 * @param allowEmpty - still perform search even if query is empty
 * @param key - cache key
 */
export function useDocsSearch(
  client: Client,
  locale?: string,
  tag?: string,
  delayMs = 100,
  allowEmpty = false,
  key?: string,
): UseDocsSearch {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);
  const onStart = useRef<() => void>();

  const cacheKey = useMemo(() => {
    return key ?? JSON.stringify([client.type, debouncedValue, locale, tag]);
  }, [client.type, debouncedValue, locale, tag, key]);

  useOnChange(cacheKey, () => {
    const cached = cache.get(cacheKey);

    if (onStart.current) {
      onStart.current();
      onStart.current = undefined;
    }

    if (cached) {
      setIsLoading(false);
      setError(undefined);
      setResults(cached);
      return;
    }

    setIsLoading(true);
    let interrupt = false;
    onStart.current = () => {
      interrupt = true;
    };

    async function run(): Promise<SortedResult[] | 'empty'> {
      if (debouncedValue.length === 0 && !allowEmpty) return 'empty';

      if (client.type === 'fetch') {
        const { fetchDocs } = await import('./client/fetch');
        return fetchDocs(debouncedValue, locale, tag, client);
      }

      if (client.type === 'algolia') {
        const { index, type: _, ...rest } = client;
        const { searchDocs } = await import('./client/algolia');

        return searchDocs(index, debouncedValue, tag, rest);
      }

      if (client.type === 'orama-cloud') {
        const { searchDocs } = await import('./client/orama-cloud');

        return searchDocs(debouncedValue, tag, client);
      }

      const { createStaticClient } = await import('./client/static');
      if (!staticClient) staticClient = createStaticClient(client);

      return staticClient.search(debouncedValue, locale, tag);
    }

    void run()
      .then((res) => {
        cache.set(cacheKey, res);
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

export type { OramaCloudOptions, FetchOptions, StaticOptions, AlgoliaOptions };
