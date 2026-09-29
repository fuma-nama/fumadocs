import type { SortedResult } from '@/search';
import type { QueryOptions } from '@/search/server/types';
import type { createContentHighlighter } from '@/search';

export type Highlighter = ReturnType<typeof createContentHighlighter>;

/**
 * Meilisearch documents are expected to contain:
 * - url: Page path including anchor (e.g., "/guide#installation")
 * - heading: The heading text for the search result
 * - pageTitle: The title of the page
 * - rawContent: Text with the search result in a Markdown format
 * - content: Plain text with the search result
 */
export type SearchHit = {
  url: string;
  heading: string;
  pageTitle: string;
  rawContent: string;
  content: string;
  _formatted?: {
    rawContent?: string;
    content?: string;
    heading?: string;
  };
};

export type FacetHit = {
  value: string;
  count: number;
};

export type ParsedCodeBlock = {
  lang: string;
  code: string;
};

/**
 * Minimal structural type for the Meilisearch client (from the `meilisearch`
 * package), so `fumadocs-core` does not need a hard dependency on the SDK.
 */
export interface MeilisearchClientLike {
  index: (indexUid: string) => {
    search: (
      query: string,
      options?: Record<string, unknown>,
    ) => Promise<{
      hits: unknown[];
      totalHits?: number;
      totalPages?: number;
    }>;
    searchForFacetValues: (options: {
      facetName: string;
      facetQuery?: string;
    }) => Promise<{ facetHits: FacetHit[] }>;
  };
}

export interface MeilisearchOptions {
  /**
   * The identifier of the Meilisearch index to search in.
   */
  indexUid: string;
  /**
   * The Meilisearch client instance.
   */
  client: MeilisearchClientLike;
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
  /**
   * Transforms a hit's `url` attribute into the final URL of the result.
   * Useful when indexed paths differ from site routes (e.g. adding a base
   * path or inserting a locale segment).
   */
  transformUrl?: (url: string) => string;
}

export interface MeilisearchQueryOptions extends QueryOptions {
  page?: number;
}

export interface MeilisearchPage {
  results: SortedResult[];
  totalHits: number;
  totalPages: number;
  page: number;
}
