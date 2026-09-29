import { escapeRegExp } from '@/search';
import { createEndpoint } from '@/search/server/endpoint';
import type { SearchAPI } from '@/search/server/types';
import type {
  FacetHit,
  MeilisearchOptions,
  MeilisearchPage,
  MeilisearchQueryOptions,
  SearchHit,
} from './meilisearch/types';
import { mapHitsToSortedResults } from './meilisearch/content';

export type {
  MeilisearchOptions,
  MeilisearchQueryOptions,
  MeilisearchPage,
} from './meilisearch/types';

const HITS_PER_PAGE = 20;

const EMPTY_PAGE: MeilisearchPage = { results: [], totalHits: 0, totalPages: 0, page: 1 };

export function createMeilisearchAPI(
  options: MeilisearchOptions,
): SearchAPI<MeilisearchQueryOptions> {
  const { indexUid, client, filterAttribute, filterAttributeValue, language, transformUrl } =
    options;

  async function searchPage(query: string, page: number): Promise<MeilisearchPage> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return EMPTY_PAGE;
    }

    const index = client.index(indexUid);
    const hits: SearchHit[] = [];
    let currentPage = page;
    let totalPages = 1;

    while (true) {
      const response = await index.search(trimmedQuery, {
        filter: createFilter(filterAttribute, filterAttributeValue, language),
        attributesToHighlight: ['heading', 'rawContent'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
        page: currentPage,
        hitsPerPage: HITS_PER_PAGE,
      });

      hits.push(...(response.hits as SearchHit[]));

      const totalHits = response.totalHits ?? 0;
      totalPages = response.totalPages ?? 1;

      const results = await mapHitsToSortedResults(hits, trimmedQuery, transformUrl);
      if (results.length > HITS_PER_PAGE || currentPage >= totalPages) {
        return { results, totalHits, totalPages, page: currentPage };
      }

      currentPage += 1;
    }
  }

  const endpoint = createEndpoint<MeilisearchQueryOptions>({
    async search(query, searchOptions) {
      return (await searchPage(query, searchOptions?.page ?? 1)).results;
    },

    async export() {
      throw new Error('Export is not implemented.');
    },
  });

  return {
    ...endpoint,
    async GET(request: Request): Promise<Response> {
      const url = new URL(request.url);
      const query = url.searchParams.get('query');
      if (!query) {
        return Response.json(EMPTY_PAGE);
      }

      const page = Number(url.searchParams.get('page'));
      const pageNumber = Number.isInteger(page) && page > 0 ? page : 1;

      return Response.json(await searchPage(query, pageNumber));
    },
  };
}

export interface UrlNormalizerOptions {
  /**
   * Locale segments that may prefix indexed URLs (e.g. `['cz', 'en']`).
   * A URL starting with one of them gets the base path inserted *after*
   * the locale.
   */
  locales?: string[];
  /**
   * Base path of the searched section, without trailing slash
   * (e.g. `/docs`). URLs not starting with it get it prepended.
   */
  basePath?: string;
}

export function createUrlNormalizer({
  locales = [],
  basePath,
}: UrlNormalizerOptions): (url: string) => string {
  const cleanBase = basePath && basePath !== '/' ? basePath.replace(/\/+$/, '') : undefined;
  const localePattern =
    locales.length > 0
      ? new RegExp(`^/(${locales.map(escapeRegExp).join('|')})(\\/.*|)$`)
      : undefined;

  return (url: string): string => {
    const localeMatch = localePattern?.exec(url);
    if (localeMatch) {
      return `/${localeMatch[1]}${cleanBase ?? ''}${localeMatch[2]}`;
    }

    if (cleanBase && !url.startsWith(cleanBase)) {
      return `${cleanBase}${url}`;
    }
    return url;
  };
}

function createFilter(
  filterAttribute?: string,
  filterAttributeValue?: string,
  language?: string,
): string | undefined {
  const conditions: string[] = [];

  if (filterAttribute && filterAttributeValue) {
    conditions.push(`${filterAttribute} = "${filterAttributeValue}"`);
  }
  if (language) {
    conditions.push(`language = "${language}"`);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : undefined;
}

export async function fetchFilters(options: MeilisearchOptions): Promise<string[]> {
  const { indexUid, client, filterAttribute } = options;

  if (!filterAttribute) {
    return [];
  }

  try {
    const index = client.index(indexUid);

    const facetResponse = await index.searchForFacetValues({
      facetName: filterAttribute,
      facetQuery: '',
    });

    return (facetResponse.facetHits as FacetHit[]).map((hit) => hit.value);
  } catch (error) {
    console.error(
      `Failed to fetch facet values for '${filterAttribute}' from index '${indexUid}':`,
      error,
    );

    return [];
  }
}
