import type { BaseIndex } from '@/search/algolia';
import type { Hit, LiteClient, SearchResponse } from 'algoliasearch/lite';
import { createContentHighlighter, type SortedResult } from '@/search/shared';

export interface AlgoliaOptions {
  indexName: string;
  client: LiteClient;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  locale?: string;

  onSearch?: (
    query: string,
    tag?: string,
    locale?: string,
  ) => Promise<{
    results: SearchResponse<BaseIndex>[];
  }>;
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
  query: string,
  { indexName, onSearch, client, locale, tag }: AlgoliaOptions,
): Promise<SortedResult[]> {
  if (query.trim().length === 0) return [];

  const result = onSearch
    ? await onSearch(query, tag, locale)
    : await client.searchForHits<BaseIndex>({
        requests: [
          {
            type: 'default',
            indexName,
            query,
            distinct: 5,
            hitsPerPage: 10,
            filters: tag ? `tag:${tag}` : undefined,
          },
        ],
      });

  const highlighter = createContentHighlighter(query);
  return groupResults(result.results[0].hits).flatMap((hit) => {
    if (hit.type === 'page') {
      return {
        ...hit,
        contentWithHighlights:
          hit.contentWithHighlights ?? highlighter.highlight(hit.content),
      };
    }

    return [];
  });
}
