import { createMeilisearchAPI, createUrlNormalizer } from 'fumadocs-core/search/meilisearch';
import {
  meiliClient,
  MEILISEARCH_INDEX,
  MEILISEARCH_URL_LOCALES,
  MEILISEARCH_URL_BASE_PATH,
} from '@/lib/meilisearch/meilisearch';

const transformUrl = createUrlNormalizer({
  locales: MEILISEARCH_URL_LOCALES,
  basePath: MEILISEARCH_URL_BASE_PATH,
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const filterAttribute = url.searchParams.get('filterAttribute') ?? undefined;
  const filterAttributeValue = url.searchParams.get('filterAttributeValue') ?? undefined;
  const language = url.searchParams.get('language') ?? undefined;

  const searchAPI = createMeilisearchAPI({
    indexUid: MEILISEARCH_INDEX,
    client: meiliClient,
    filterAttribute: filterAttribute,
    filterAttributeValue: filterAttributeValue,
    language: language,
    transformUrl,
  });
  return searchAPI.GET(request);
}
