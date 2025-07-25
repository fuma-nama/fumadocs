import { useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import type { SortedResult } from '@/server/types';
import { type FetchOptions } from '@/search/client/fetch';
import { useOnChange } from '@/utils/use-on-change';
import { type StaticOptions } from '@/search/client/static';
import { type AlgoliaOptions } from '@/search/client/algolia';
import { type OramaCloudOptions } from '@/search/client/orama-cloud';
import { type MixedbreadOptions } from '@/search/client/mixedbread';

interface UseDocsSearch {
  search: string;
  setSearch: (v: string) => void;
  query: {
    isLoading: boolean;
    data?: SortedResult[] | 'empty';
    error?: Error;
  };
}

export type Client =
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
    } & OramaCloudOptions)
  | ({
      type: 'mixedbread';
    } & MixedbreadOptions);

function isDifferentDeep(a: unknown, b: unknown): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    return b.length !== a.length || a.some((v, i) => isDifferentDeep(v, b[i]));
  }

  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    return (
      aKeys.length !== bKeys.length ||
      aKeys.some((key) =>
        isDifferentDeep(a[key as keyof object], b[key as keyof object]),
      )
    );
  }

  return a !== b;
}

/**
 * Provide a hook to query different official search clients.
 *
 * Note: it will re-query when its parameters changed, make sure to use `useCallback()` on functions passed to this hook.
 */
export function useDocsSearch(
  clientOptions: Client & {
    /**
     * The debounced delay for performing a search (in ms).
     * .
     * @defaultValue 100
     */
    delayMs?: number;

    /**
     * still perform search even if query is empty.
     *
     * @defaultValue false
     */
    allowEmpty?: boolean;
  },
  /**
   * @deprecated pass to `client` object instead
   */
  _locale?: string,
  /**
   * @deprecated pass to `client` object instead
   */
  _tag?: string,
  /**
   * @deprecated pass to `client` object instead
   */
  _delayMs = 100,
  /**
   * @deprecated pass to `client` object instead
   */
  _allowEmpty = false,
  /**
   * @deprecated No longer used
   */
  _key?: string,
): UseDocsSearch {
  // handle deprecated params
  const {
    delayMs = _delayMs ?? 100,
    allowEmpty = _allowEmpty ?? false,
    ...client
  } = clientOptions;
  client.tag ??= _tag;
  client.locale ??= _locale;

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);
  const onStart = useRef<() => void>(undefined);

  useOnChange(
    [client, debouncedValue],
    () => {
      if (onStart.current) {
        onStart.current();
        onStart.current = undefined;
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
          return fetchDocs(debouncedValue, client);
        }

        if (client.type === 'algolia') {
          const { searchDocs } = await import('./client/algolia');
          return searchDocs(debouncedValue, client);
        }

        if (client.type === 'orama-cloud') {
          const { searchDocs } = await import('./client/orama-cloud');
          return searchDocs(debouncedValue, client);
        }

        if (client.type === 'static') {
          const { search } = await import('./client/static');
          return search(debouncedValue, client);
        }

        if (client.type === 'mixedbread') {
          const { search } = await import('./client/mixedbread');
          return search(debouncedValue, client);
        }

        throw new Error('unknown search client');
      }

      void run()
        .then((res) => {
          if (interrupt) return;

          setError(undefined);
          setResults(res);
        })
        .catch((err: Error) => {
          setError(err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    isDifferentDeep,
  );

  return { search, setSearch, query: { isLoading, data: results, error } };
}

export type { OramaCloudOptions, FetchOptions, StaticOptions, AlgoliaOptions };
