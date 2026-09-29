import { SortedResult } from '..';
import type { SearchClient } from '../client';

export interface MeilisearchClientOptions {
  /**
   * Attribute name used for filtering.
   */
  filterAttribute?: string;
  /**
   * Concrete value of 'filterAttribute' to filter results by.
   */
  filterAttributeValue?: string;
  /**
   * Value of the 'language' attribute to restrict results to one locale.
   */
  language?: string;
}

export interface MeilisearchFilterOptions {
  /**
   * Attribute name used for filtering.
   */
  filterAttribute: string;
}

export interface MeilisearchSearchPage {
  results: SortedResult[];
  totalHits: number;
  totalPages: number;
  page: number;
}

function buildSearchUrl(query: string, page: number, options: MeilisearchClientOptions): URL {
  const { filterAttribute, filterAttributeValue, language } = options;

  const url = new URL('/api/meilisearch-search', window.location.origin);
  url.searchParams.set('query', query);
  url.searchParams.set('page', String(page));
  if (filterAttribute) url.searchParams.set('filterAttribute', filterAttribute);
  if (filterAttributeValue) url.searchParams.set('filterAttributeValue', filterAttributeValue);
  if (language) url.searchParams.set('language', language);

  return url;
}

export async function meilisearchSearchPage(
  options: MeilisearchClientOptions,
  query: string,
  page = 1,
): Promise<MeilisearchSearchPage> {
  const res = await fetch(buildSearchUrl(query, page, options));
  if (!res.ok) throw new Error(await res.text());

  return (await res.json()) as MeilisearchSearchPage;
}

export function meilisearchClient(options: MeilisearchClientOptions): SearchClient {
  return {
    async search(query) {
      const { results } = await meilisearchSearchPage(options, query, 1);
      return results;
    },
    async searchPage(query, page) {
      const {
        results,
        page: currentPage,
        totalPages,
      } = await meilisearchSearchPage(options, query, page);
      return { results, page: currentPage, totalPages };
    },
  };
}

export async function meilisearchFilters({
  filterAttribute,
}: MeilisearchFilterOptions): Promise<string[]> {
  const api = '/api/meilisearch-filters';
  const url = new URL(api, window.location.origin);

  if (filterAttribute) url.searchParams.set('filterAttribute', filterAttribute);
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const result = (await res.json()) as string[];

  return result;
}
