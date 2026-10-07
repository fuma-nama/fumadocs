export type { UseSearchOptions, SearchResult, UseSearchReturn } from './use-search';
export { useFetchSearch, type FetchOptions } from './client/fetch';
export { useStaticSearch, type StaticOptions } from './client/orama-static';
export { useAlgoliaSearch, type AlgoliaOptions } from './client/algolia';
export { useOramaCloudSearch, type OramaCloudOptions } from './client/orama-cloud';
export { useMeilisearch, type MeilisearchOptions } from './client/meilisearch';
export { useDocsSearch, type ClientPreset, type SearchClient } from './client/docs-search';
