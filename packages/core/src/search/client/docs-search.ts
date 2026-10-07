import { type DependencyList, useCallback } from 'react';
import type { SortedResult } from '@/search';
import type { Awaitable } from '@/types';
import { type SearchResultRecord, type UseSearchOptions, useSearch } from '../use-search';
import type { FetchOptions } from './fetch';
import type { StaticOptions } from './orama-static';
import type { AlgoliaOptions } from './algolia';
import type { OramaCloudOptions } from './orama-cloud';
import type { OramaCloudLegacyOptions } from './orama-cloud-legacy';
import type { MixedbreadOptions } from './mixedbread';
import type { FlexsearchStaticOptions } from './flexsearch-static';

export interface SearchClient {
  search: (query: string) => Awaitable<SortedResult[]>;
  deps?: DependencyList;
}

export type ClientPreset =
  | ({ type: 'fetch' } & FetchOptions)
  | ({ type: 'static' } & StaticOptions)
  | ({ type: 'algolia' } & AlgoliaOptions)
  | ({ type: 'orama-cloud' } & OramaCloudOptions)
  | ({ type: 'orama-cloud-legacy' } & OramaCloudLegacyOptions)
  | ({ type: 'flexsearch-static' } & FlexsearchStaticOptions)
  | ({ type: 'mixedbread' } & MixedbreadOptions)
  | { client: SearchClient };

type PresetOptions = Extract<ClientPreset, { type: string }>;

/**
 * Provide a hook to query different official search clients.
 *
 * Note: it will re-query when its parameters changed, make sure to define `deps` array if you encounter rendering issues.
 *
 * @deprecated Use the search hook of your provider instead, like `useFetchSearch()`.
 */
export function useDocsSearch(
  { delayMs, allowEmpty, ...options }: ClientPreset & UseSearchOptions,
  customDeps?: DependencyList,
) {
  const client = 'type' in options ? presetClient(options) : options.client;
  const run = useCallback((query: string) => client.search(query), customDeps ?? client.deps ?? []);
  const output = useSearch(run, { delayMs, allowEmpty });
  const { isLoading, result } = output;
  let data: SearchResultRecord[] | 'empty' = 'empty';
  if (result.items) {
    data = [];
    for (const item of result.items) {
      if (item.type === 'table') data.push(...item.rows);
      else data.push(item);
    }
  }

  return {
    ...output,
    setSearch: output.onSearchChange,
    query: { isLoading, data, error: result.error },
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
