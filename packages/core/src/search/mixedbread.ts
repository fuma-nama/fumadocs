import type { SortedResult } from '@/search';
import type Mixedbread from '@mixedbread/sdk';
import type { StoreSearchParams, StoreSearchResponse } from '@mixedbread/sdk/resources/stores';
import removeMd from 'remove-markdown';
import Slugger from 'github-slugger';
import { createEndpoint } from '@/search/orama/create-endpoint';
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

const slugger = new Slugger();

function extractHeadingTitle(text: string): string {
  const trimmedText = text.trim();

  if (!trimmedText.startsWith('#')) {
    return '';
  }

  const lines = trimmedText.split('\n');
  const firstLine = lines[0]?.trim();

  if (firstLine) {
    return removeMd(firstLine, {
      useImgAltText: false,
    });
  }

  return '';
}

function defaultTransform(results: StoreSearchResult[]): SortedResult[] {
  return results.flatMap((item) => {
    const metadata = item.generated_metadata;

    const url = metadata.url || '#';
    const title = metadata.title || 'Untitled';

    const chunkResults: SortedResult[] = [
      {
        id: `${item.file_id}-${item.chunk_index}-page`,
        type: 'page',
        content: title,
        url,
      },
    ];

    const headingTitle = item.type === 'text' && item.text ? extractHeadingTitle(item.text) : '';

    if (headingTitle) {
      slugger.reset();

      chunkResults.push({
        id: `${item.file_id}-${item.chunk_index}-heading`,
        type: 'heading',
        content: headingTitle,
        url: `${url}#${slugger.slug(headingTitle)}`,
      });
    }

    return chunkResults;
  });
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
    async search(query, searchOptions) {
      if (!query.trim()) {
        return [];
      }

      const tag = searchOptions?.tag;

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
        top_k: topK,
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
