export {
  useSearchClient,
  type SearchClient,
  type UseSearchOptions,
  type SearchResult,
  type UseSearchReturn,
} from './use-search-client';
export { useFetchSearch, type FetchOptions } from './client/fetch';
export { useStaticSearch, type StaticOptions } from './client/orama-static';
export { useAlgoliaSearch, type AlgoliaOptions } from './client/algolia';
export { useOramaCloudSearch, type OramaCloudOptions } from './client/orama-cloud';
export { useMeilisearch, type MeilisearchOptions } from './client/meilisearch';
export { useDocsSearch, type ClientPreset } from './client/docs-search';
