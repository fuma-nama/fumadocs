import { type DependencyList, useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import { type FetchOptions } from '@/search/client/fetch';
import { useOnChange } from '@/utils/use-on-change';
import { type StaticOptions } from '@/search/client/static';
import { type AlgoliaOptions } from '@/search/client/algolia';
import { type OramaCloudOptions } from '@/search/client/orama-cloud';
import { type OramaCloudLegacyOptions } from '@/search/client/orama-cloud-legacy';
import { type MixedbreadOptions } from '@/search/client/mixedbread';
import type { SortedResult } from '@/search';

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
      type: 'orama-cloud-legacy';
    } & OramaCloudLegacyOptions)
  | ({
      type: 'mixedbread';
    } & MixedbreadOptions);

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    return b.length === a.length && a.every((v, i) => isDeepEqual(v, b[i]));
  }

  if (typeof a === 'object' && a && typeof b === 'object' && b) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);

    return (
      aKeys.length === bKeys.length &&
      aKeys.every(
        (key) =>
          Object.hasOwn(b, key) && isDeepEqual(a[key as keyof object], b[key as keyof object]),
      )
    );
  }

  return false;
}

/**
 * Provide a hook to query different official search clients.
 *
 * Note: it will re-query when its parameters changed, make sure to use `useMemo()` on `clientOptions` or define `deps` array.
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
  deps?: DependencyList,
): UseDocsSearch {
  const { delayMs = 100, allowEmpty = false, ...client } = clientOptions;

  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);
  const onStart = useRef<() => void>(undefined);

  useOnChange(
    [deps ?? clientOptions, debouncedValue],
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
        switch (client.type) {
          case 'fetch': {
            const { fetchDocs } = await import('./client/fetch');
            return fetchDocs(debouncedValue, client);
          }
          case 'algolia': {
            const { searchDocs } = await import('./client/algolia');
            return searchDocs(debouncedValue, client);
          }
          case 'orama-cloud': {
            const { searchDocs } = await import('./client/orama-cloud');
            return searchDocs(debouncedValue, client);
          }
          case 'orama-cloud-legacy': {
            const { searchDocs } = await import('./client/orama-cloud-legacy');
            return searchDocs(debouncedValue, client);
          }
          case 'mixedbread': {
            const { search } = await import('./client/mixedbread');
            return search(debouncedValue, client);
          }
          case 'static': {
            const { search } = await import('./client/static');
            return search(debouncedValue, client);
          }
          default:
            throw new Error('unknown search client');
        }
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
    deps ? undefined : (a, b) => !isDeepEqual(a, b),
  );

  return { search, setSearch, query: { isLoading, data: results, error } };
}

export type { OramaCloudOptions, FetchOptions, StaticOptions, AlgoliaOptions };
