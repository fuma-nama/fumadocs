import type { SortedResult } from '@/search';
import type Mixedbread from '@mixedbread/sdk';
import type { StoreSearchParams, StoreSearchResponse } from '@mixedbread/sdk/resources/stores';
import { slug } from 'github-slugger';
import { headingIdRegex } from '@/mdx-plugins/heading-id';
import { createEndpoint } from '@/search/server/endpoint';
import type { SearchAPI } from '@/search/server';

export interface SearchMetadata {
  title?: string;
  description?: string;
  url?: string;
  tag?: string;
}

type StoreSearchResult = StoreSearchResponse['data'][number] & {
  generated_metadata: SearchMetadata;
};

export interface MixedbreadSearchOptions {
  /**
   * The Mixedbread SDK client instance
   */
  client: Mixedbread;

  /**
   * The identifier of the store to search in
   */
  storeIdentifier: string;

  /**
   * Maximum number of results to return
   *
   * @defaultValue 10
   */
  topK?: number;

  /**
   * Re-rank search results for improved relevance (this adds latency to the search)
   */
  rerank?: boolean;

  /**
   * Rewrite the query for better search results (this adds latency to the search)
   */
  rewriteQuery?: boolean;

  /**
   * Minimum score threshold for results
   */
  scoreThreshold?: number;

  /**
   * Custom transform function for search results
   */
  transform?: (results: StoreSearchResult[], query: string) => SortedResult[];
}

function defaultTransform(results: StoreSearchResult[]): SortedResult[] {
  // file ID -> the page and its matched headings
  const groups = new Map<string, SortedResult[]>();

  for (const item of results) {
    const metadata = item.generated_metadata;
    const url = metadata.url || '#';
    let group = groups.get(item.file_id);
    if (!group) {
      group = [{ id: item.file_id, type: 'page', content: metadata.title || 'Untitled', url }];
      groups.set(item.file_id, group);
    }

    // the heading a chunk starts with
    const heading =
      item.type === 'text' && item.text?.trimStart().startsWith('#') && 'chunk_headings' in metadata
        ? metadata.chunk_headings?.[0]?.text
        : undefined;
    if (!heading) continue;

    const id = headingIdRegex.exec(heading);
    const content = id ? heading.slice(0, id.index) : heading;
    group.push({
      id: `${item.file_id}-${item.chunk_index}`,
      type: 'heading',
      content,
      url: `${url}#${id?.groups?.slug ?? slug(content)}`,
    });
  }

  return [...groups.values()].flat();
}

export function createMixedbreadSearchAPI(options: MixedbreadSearchOptions): SearchAPI {
  const {
    client,
    storeIdentifier,
    topK = 10,
    rerank,
    rewriteQuery,
    scoreThreshold,
    transform,
  } = options;

  return createEndpoint({
    async search(query, searchOptions = {}) {
      if (!query.trim()) {
        return [];
      }

      const { tag, limit } = searchOptions;
      let filters: StoreSearchParams['filters'] | undefined;
      if (Array.isArray(tag) && tag.length > 0) {
        filters = {
          key: 'generated_metadata.tag',
          operator: 'in',
          value: tag,
        };
      } else if (typeof tag === 'string') {
        filters = {
          key: 'generated_metadata.tag',
          operator: 'eq',
          value: tag,
        };
      }

      const res = await client.stores.search({
        query,
        store_identifiers: [storeIdentifier],
        top_k: limit ?? topK,
        filters,
        search_options: {
          return_metadata: true,
          rerank,
          rewrite_query: rewriteQuery,
          score_threshold: scoreThreshold,
        },
      });

      const results = res.data as StoreSearchResult[];

      if (transform) {
        return transform(results, query);
      }

      return defaultTransform(results);
    },
    async export() {
      throw new Error(
        'Mixedbread search does not support exporting indexes. Use the Mixedbread dashboard to manage your store.',
      );
    },
  });
}
