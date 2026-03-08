import { type DependencyList, use, useRef, useState } from 'react';
import { useDebounce } from '@/utils/use-debounce';
import { type FetchOptions } from '@/search/client/fetch';
import { useOnChange } from '@/utils/use-on-change';
import type { StaticOptions } from '@/search/client/orama-static';
import type { AlgoliaOptions } from '@/search/client/algolia';
import type { OramaCloudOptions } from '@/search/client/orama-cloud';
import type { OramaCloudLegacyOptions } from '@/search/client/orama-cloud-legacy';
import type { MixedbreadOptions } from '@/search/client/mixedbread';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';
import type { FlexsearchStaticOptions } from './client/flexsearch-static';

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
      type: 'flexsearch-static';
    } & FlexsearchStaticOptions)
  | ({
      /**
       * @deprecated Use `createMixedbreadSearchAPI` from `fumadocs-core/search/mixedbread` instead.
       * This client-side approach exposes your API key in the browser.
       * The server-side approach keeps the key secure and uses `type: 'fetch'` on the client.
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

const promiseMap: Record<string, Promise<unknown>> = {};

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
  deps?: DependencyList,
): UseDocsSearch {
  const { delayMs = 100, allowEmpty = false, ...clientRest } = clientOptions;
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<SortedResult[] | 'empty'>('empty');
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);
  const onStart = useRef<() => void>(undefined);

  let client: SearchClient;

  if ('type' in clientRest) {
    switch (clientRest.type) {
      case 'fetch': {
        const res = (promiseMap[clientRest.type] ??= import('./client/fetch')) as Promise<
          typeof import('./client/fetch')
        >;
        const { fetchClient } = use(res);
        client = fetchClient(clientRest);
        break;
      }
      case 'algolia': {
        const res = (promiseMap[clientRest.type] ??= import('./client/algolia')) as Promise<
          typeof import('./client/algolia')
        >;
        const { algoliaClient } = use(res);
        client = algoliaClient(clientRest);
        break;
      }
      case 'orama-cloud': {
        const res = (promiseMap[clientRest.type] ??= import('./client/orama-cloud')) as Promise<
          typeof import('./client/orama-cloud')
        >;
        const { oramaCloudClient } = use(res);
        client = oramaCloudClient(clientRest);
        break;
      }
      case 'orama-cloud-legacy': {
        const res = (promiseMap[clientRest.type] ??=
          import('./client/orama-cloud-legacy')) as Promise<
          typeof import('./client/orama-cloud-legacy')
        >;
        const { oramaCloudLegacyClient } = use(res);
        client = oramaCloudLegacyClient(clientRest);
        break;
      }
      case 'mixedbread': {
        const res = (promiseMap[clientRest.type] ??= import('./client/mixedbread')) as Promise<
          typeof import('./client/mixedbread')
        >;
        const { mixedbreadClient } = use(res);
        client = mixedbreadClient(clientRest);
        break;
      }
      case 'static': {
        const res = (promiseMap[clientRest.type] ??= import('./client/orama-static')) as Promise<
          typeof import('./client/orama-static')
        >;
        const { oramaStaticClient } = use(res);
        client = oramaStaticClient(clientRest);
        break;
      }
      case 'flexsearch-static': {
        const res = (promiseMap[clientRest.type] ??=
          import('./client/flexsearch-static')) as Promise<
          typeof import('./client/flexsearch-static')
        >;
        const { flexsearchStaticClient } = use(res);
        client = flexsearchStaticClient(clientRest);
        break;
      }
      default:
        throw new Error('unknown search client');
    }
  } else {
    client = clientRest.client;
  }

  useOnChange([deps ?? client.deps, debouncedValue], () => {
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
      return client.search(debouncedValue);
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
  });

  return { search, setSearch, query: { isLoading, data: results, error } };
}

// TODO: remove this on next major
export type { OramaCloudOptions, FetchOptions, StaticOptions, AlgoliaOptions };
