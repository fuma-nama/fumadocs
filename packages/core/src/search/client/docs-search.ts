import type { DependencyList } from 'react';
import type { SortedResult } from '@/search';
import {
  type SearchClient,
  type UseSearchOptions,
  useSearchClient,
} from '@/search/use-search-client';
import type { FetchOptions } from './fetch';
import type { StaticOptions } from './orama-static';
import type { AlgoliaOptions } from './algolia';
import type { OramaCloudOptions } from './orama-cloud';
import type { OramaCloudLegacyOptions } from './orama-cloud-legacy';
import type { MixedbreadOptions } from './mixedbread';
import type { FlexsearchStaticOptions } from './flexsearch-static';

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
       * @deprecated Pass `client: staticClient(...)` instead.
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

type PresetOptions = Extract<ClientPreset, { type: string }>;

/**
 * Provide a hook to query different official search clients.
 *
 * Note: it will re-query when its parameters changed, make sure to define `deps` array if you encounter rendering issues.
 *
 * @deprecated Use the search hook of your provider instead, like `useFetchSearch()`, or `useSearchClient()` for other search clients.
 */
export function useDocsSearch(
  { delayMs, allowEmpty, ...options }: ClientPreset & UseSearchOptions,
  customDeps?: DependencyList,
): UseDocsSearch {
  const client = 'type' in options ? presetClient(options) : options.client;
  const { search, setSearch, isLoading, result } = useSearchClient(
    customDeps ? { deps: customDeps, search: (query) => client.search(query) } : client,
    { delayMs, allowEmpty },
  );

  return {
    search,
    setSearch,
    query: { isLoading, data: result.data ?? 'empty', error: result.error },
  };
}

function presetClient(options: PresetOptions): SearchClient {
  const client = loadPreset(options);

  return {
    // `JSON.stringify` can still offer near-accurate results in this case
    deps: [JSON.stringify(options)],
    search: async (query) => (await client).search(query),
  };
}

function loadPreset(options: PresetOptions): Promise<SearchClient> {
  switch (options.type) {
    case 'fetch':
      return import('./fetch').then((mod) => mod.fetchClient(options));
    case 'algolia':
      return import('./algolia').then((mod) => mod.algoliaClient(options));
    case 'orama-cloud':
      return import('./orama-cloud').then((mod) => mod.oramaCloudClient(options));
    case 'orama-cloud-legacy':
      return import('./orama-cloud-legacy').then((mod) => mod.oramaCloudLegacyClient(options));
    case 'mixedbread':
      return import('./mixedbread').then((mod) => mod.mixedbreadClient(options));
    case 'static':
      return import('./orama-static').then((mod) => mod.staticClient(options));
    default:
      throw new Error('unknown search client');
  }
}
