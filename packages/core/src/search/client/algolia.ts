import type { Hit, SearchOptions } from '@algolia/client-search';
import type { SearchIndex } from 'algoliasearch/lite';
import type { SortedResult } from '@/server/types';
import type { BaseIndex } from '@/search/algolia';

export interface AlgoliaOptions extends SearchOptions {
  index: SearchIndex;
}

export function groupResults(hits: Hit<BaseIndex>[]): SortedResult[] {
  const grouped: SortedResult[] = [];
  const scannedUrls = new Set<string>();

  for (const hit of hits) {
    if (!scannedUrls.has(hit.url)) {
      scannedUrls.add(hit.url);

      grouped.push({
        id: hit.url,
        type: 'page',
        url: hit.url,
        content: hit.title,
      });
    }

    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.section_id ? `${hit.url}#${hit.section_id}` : hit.url,
      content: hit.content,
    });
  }

  return grouped;
}

export async function searchDocs(
  index: SearchIndex,
  query: string,
  tag?: string,
  options?: SearchOptions,
): Promise<SortedResult[]> {
  if (query.length === 0) {
    let filters = options?.filters;
    if (tag) filters = filters ? `tag:${tag} AND (${filters})` : `tag:${tag}`;

    const result = await index.search<BaseIndex>(query, {
      distinct: 1,
      hitsPerPage: 8,
      ...options,
      filters,
    });

    return groupResults(result.hits).filter((hit) => hit.type === 'page');
  }

  const result = await index.search<BaseIndex>(query, {
    distinct: 5,
    hitsPerPage: 10,
    ...options,
  });

  return groupResults(result.hits);
}
