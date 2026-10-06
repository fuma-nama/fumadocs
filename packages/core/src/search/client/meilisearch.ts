import type { Meilisearch } from 'meilisearch';
import type { MeilisearchDocument } from '@/search/meilisearch';
import type { SortedResult } from '@/search';
import {
  type SearchClient,
  type UseSearchOptions,
  type UseSearchReturn,
  useSearchClient,
} from '@/search/use-search-client';

export interface MeilisearchOptions {
  /**
   * Meilisearch client with a search API key
   */
  client: Meilisearch;
  indexName: string;

  /**
   * Filter results with specific tag(s).
   */
  tag?: string | string[];

  /**
   * Filter results by locale.
   */
  locale?: string;
}

export function meilisearchClient(options: MeilisearchOptions): SearchClient {
  const { client, indexName, tag, locale } = options;

  return {
    deps: [client, indexName, tag, locale],
    async search(query) {
      if (query.trim().length === 0) return [];

      const filter: string[] = [];
      if (locale) filter.push(`locale = ${JSON.stringify(locale)}`);
      for (const item of typeof tag === 'string' ? [tag] : (tag ?? []))
        filter.push(`tag = ${JSON.stringify(item)}`);

      const { hits } = await client
        .index<MeilisearchDocument>(indexName)
        .search(query, { filter, limit: 20 });
      // page URL -> the page and its matched sections
      const groups = new Map<string, SortedResult[]>();

      for (const hit of hits) {
        let group = groups.get(hit.url);
        if (!group) {
          group = [
            {
              id: hit.url,
              type: 'page',
              content: hit.title,
              breadcrumbs: hit.breadcrumbs,
              url: hit.url,
            },
          ];
          groups.set(hit.url, group);
        }

        if (hit.type === 'page') continue;
        group.push({
          id: hit.id.toString(),
          type: hit.type,
          content: hit.content,
          url: hit.heading ? `${hit.url}#${hit.heading}` : hit.url,
        });
      }

      const results: SortedResult[] = [];
      for (const group of groups.values()) results.push(...group);
      return results;
    },
  };
}

export function useMeilisearch(options: MeilisearchOptions & UseSearchOptions): UseSearchReturn {
  return useSearchClient(meilisearchClient(options), options);
}
