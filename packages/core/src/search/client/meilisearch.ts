import { useCallback } from 'react';
import type { Meilisearch } from 'meilisearch';
import type { MeilisearchDocument } from '@/search/meilisearch';
import type { SortedResult } from '@/search';
import type { SearchClient } from '../client';
import { type UseSearchOptions, useSearch } from '../use-search';

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

async function searchMeilisearch(
  options: MeilisearchOptions,
  query: string,
): Promise<SortedResult[]> {
  const { client, indexName, tag, locale } = options;
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
      table: hit.table,
    });
  }

  const results: SortedResult[] = [];
  for (const group of groups.values()) results.push(...group);
  return results;
}

export function meilisearchClient(options: MeilisearchOptions): SearchClient {
  return {
    deps: [options.client, options.indexName, String(options.tag), options.locale],
    search: (query) => searchMeilisearch(options, query),
  };
}

export function useMeilisearch({
  client,
  indexName,
  locale,
  tag,
  ...rest
}: MeilisearchOptions & UseSearchOptions) {
  const tags = String(tag ?? '');
  const run = useCallback(
    (query: string) =>
      searchMeilisearch(
        { client, indexName, locale, tag: tags ? tags.split(',') : undefined },
        query,
      ),
    [client, indexName, locale, tags],
  );
  return useSearch(run, rest);
}
