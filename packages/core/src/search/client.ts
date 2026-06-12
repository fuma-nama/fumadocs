import { type DependencyList, useMemo, useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import { type FetchOptions } from '@/search/client/fetch';
import type { StaticOptions } from '@/search/client/orama-static';
import type { AlgoliaOptions } from '@/search/client/algolia';
import type { OramaCloudOptions } from '@/search/client/orama-cloud';
import type { OramaCloudLegacyOptions } from '@/search/client/orama-cloud-legacy';
import type { MixedbreadOptions } from '@/search/client/mixedbread';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';
import type { FlexsearchStaticOptions } from './client/flexsearch-static';
import { isEqualShallow } from '@/utils/is-equal';

interface UseDocsSearch {
  search: string;
  setSearch: (v: string) => void;
  query: {
    isLoading: boolean;
    data?: SortedResult[] | 'empty';
    error?: Error;
  };
}

export type ClientPreset =
  | ({
      /**
       * @deprecated Pass `client: fetchClient(...)` instead.
       */
      type: 'fetch';
    } & FetchOptions)
  | ({
      /**
       * @deprecated Pass `client: oramaStaticClient(...)` instead.
       */
      type: 'static';
    } & StaticOptions)
  | ({
      /**
       * @deprecated Pass `client: algoliaClient(...)` instead.
       */
      type: 'algolia';
    } & AlgoliaOptions)
  | ({
      /**
       * @deprecated Pass `client: oramaCloudClient(...)` instead.
       */
      type: 'orama-cloud';
    } & OramaCloudOptions)
  | ({
      /**
       * @deprecated Pass `client: oramaCloudLegacyClient(...)` instead.
       */
      type: 'orama-cloud-legacy';
    } & OramaCloudLegacyOptions)
  | ({
      /**
       * @deprecated Pass `client: flexsearchStaticClient(...)` instead.
       */
      type: 'flexsearch-static';
    } & FlexsearchStaticOptions)
  | ({
      /**
       * @deprecated Use `createMixedbreadSearchAPI` from `fumadocs-core/search/mixedbread` instead.
       * This client-side approach exposes your API key in the browser.
       * The server-side approach keeps the key secure and uses `client: fetchClient(...)` on the client.
       */
      type: 'mixedbread';
    } & MixedbreadOptions)
  | {
      client: SearchClient;
    };

export interface SearchClient {
  search: (query: string) => Awaitable<SortedResult[]>;
  deps?: DependencyList;
}

/**
 * Provide a hook to query different official search clients.
 *
 * Note: it will re-query when its parameters changed, make sure to define `deps` array if you encounter rendering issues.
 */
export function useDocsSearch(
  clientOptions: ClientPreset & {
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
  customDeps?: DependencyList,
): UseDocsSearch {
  const { delayMs = 100, allowEmpty = false, ...clientRest } = clientOptions;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);

  let client: SearchClient | Promise<SearchClient>;

  if ('type' in clientRest) {
    switch (clientRest.type) {
      case 'fetch': {
        client = import('./client/fetch').then((mod) => mod.fetchClient(clientRest));
        break;
      }
      case 'algolia': {
        client = import('./client/algolia').then((mod) => mod.algoliaClient(clientRest));
        break;
      }
      case 'orama-cloud': {
        client = import('./client/orama-cloud').then((mod) => mod.oramaCloudClient(clientRest));
        break;
      }
      case 'orama-cloud-legacy': {
        client = import('./client/orama-cloud-legacy').then((mod) =>
          mod.oramaCloudLegacyClient(clientRest),
        );
        break;
      }
      case 'mixedbread': {
        client = import('./client/mixedbread').then((mod) => mod.mixedbreadClient(clientRest));
        break;
      }
      case 'static': {
        client = import('./client/orama-static').then((mod) => mod.oramaStaticClient(clientRest));
        break;
      }
      default:
        throw new Error('unknown search client');
    }
  } else {
    client = clientRest.client;
  }

  const deps: DependencyList = [
    customDeps ??
      (client instanceof Promise
        ? // `type: "xxx"` usage is deprecated and will be removed soon
          // `JSON.stringify` can still offer near-accurate results in this case
          JSON.stringify(clientRest)
        : client.deps),
    debouncedValue,
  ];
  const [activeDeps, setActiveDeps] = useState<DependencyList | null>(null);
  const activeTaskRef = useRef<{
    deps: DependencyList;
    start: () => void;
    interrupt: boolean;
  } | null>(null);

  if (
    !isEqualShallow(activeDeps, deps) &&
    (!activeTaskRef.current || !isEqualShallow(activeTaskRef.current.deps, deps))
  ) {
    if (activeTaskRef.current) activeTaskRef.current.interrupt = true;

    activeTaskRef.current = {
      deps,
      interrupt: false,
      async start() {
        try {
          setIsLoading(true);

          let res: SortedResult[] | 'empty';
          if (debouncedValue.length === 0 && !allowEmpty) res = 'empty';
          else res = await (await client).search(debouncedValue);

          if (!this.interrupt) {
            setActiveDeps(deps);
            setError(undefined);
            setResults(res);
          }
        } catch (err) {
          if (!this.interrupt) setError(err as Error);
        } finally {
          if (!this.interrupt) setIsLoading(false);
        }
      },
    };
    void activeTaskRef.current.start();
  }

  return useMemo(
    () => ({ search, setSearch, query: { isLoading, data: results, error } }),
    [search, isLoading, results, error],
  );
}

// TODO: remove this on next major
export type { OramaCloudOptions, FetchOptions, StaticOptions, AlgoliaOptions };
