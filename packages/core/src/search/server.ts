import { Document } from 'flexsearch';
import { type NextRequest, type NextResponse } from 'next/server';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { SortedResult } from '@/server/types';
import { createEndpoint } from '@/search/create-endpoint';

export interface SearchAPI {
  GET: (request: NextRequest) => Promise<NextResponse<SortedResult[]>>;

  search: (
    query: string,
    options?: { locale?: string; tag?: string },
  ) => Promise<SortedResult[]>;
}

/**
 * Resolve indexes dynamically
 */
export type Dynamic<T> = () => T[] | Promise<T[]>;

export interface SimpleOptions {
  indexes: Index[] | Dynamic<Index>;
  language?: string;
}

export interface AdvancedOptions {
  indexes: AdvancedIndex[] | Dynamic<AdvancedIndex>;

  /**
   * Enable search tags for filtering results
   *
   * @defaultValue false
   */
  tag?: boolean;
  language?: string;
}

export function createSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? SimpleOptions : AdvancedOptions,
): SearchAPI {
  if (type === 'simple') {
    return initSearchAPI(options as SimpleOptions);
  }

  return initSearchAPIAdvanced(options as AdvancedOptions);
}

export interface Index {
  title: string;
  description?: string;
  content: string;
  url: string;
  keywords?: string;
}

export function initSearchAPI({ indexes, language }: SimpleOptions): SearchAPI {
  const store = ['title', 'url'];

  async function getDocument(): Promise<Document<Index, string[]>> {
    const items = typeof indexes === 'function' ? await indexes() : indexes;
    const index = new Document<Index, typeof store>({
      language,
      optimize: true,
      cache: 100,
      document: {
        id: 'url',
        store,
        index: [
          {
            field: 'title',
            tokenize: 'forward',
            resolution: 9,
          },
          {
            field: 'description',
            tokenize: 'strict',
            context: {
              depth: 1,
              resolution: 9,
            },
          },
          {
            field: 'content',
            tokenize: 'strict',
            context: {
              depth: 1,
              resolution: 9,
            },
          },
          {
            field: 'keywords',
            tokenize: 'strict',
            resolution: 9,
          },
        ],
      },
    });

    for (const page of items) {
      index.add({
        title: page.title,
        description: page.description,
        url: page.url,
        content: page.content,
        keywords: page.keywords,
      });
    }
    return index;
  }

  const doc = getDocument();
  return createEndpoint(async (query) => {
    const results = (await doc).search(query, 5, {
      enrich: true,
      suggest: true,
    });

    if (results.length === 0) return [];

    return results[0].result.map<SortedResult>((page) => ({
      type: 'page',
      content: page.doc.title,
      id: page.doc.url,
      url: page.doc.url,
    }));
  });
}

export interface AdvancedIndex {
  id: string;
  title: string;
  description?: string;

  keywords?: string;

  /**
   * Required if tag filter is enabled
   */
  tag?: string;
  /**
   * preprocess mdx content with `structure`
   */
  structuredData: StructuredData;
  url: string;
}

interface InternalIndex {
  id: string;
  url: string;
  page_id: string;
  type: 'page' | 'heading' | 'text';
  content: string;

  tag?: string;
  keywords?: string;
}

export function initSearchAPIAdvanced({
  indexes,
  language,
  tag = false,
}: AdvancedOptions): SearchAPI {
  const store = ['id', 'url', 'content', 'page_id', 'type', 'keywords'];

  async function getDocument(): Promise<Document<InternalIndex, string[]>> {
    const items = typeof indexes === 'function' ? await indexes() : indexes;
    const index = new Document<InternalIndex, typeof store>({
      language,
      cache: 100,
      optimize: true,
      document: {
        id: 'id',
        tag: tag ? 'tag' : undefined,
        store,
        index: [
          {
            field: 'content',
            tokenize: 'forward',
            context: { depth: 2, bidirectional: true, resolution: 9 },
          },
          {
            field: 'keywords',
            tokenize: 'strict',
            resolution: 9,
          },
        ],
      },
    });

    for (const page of items) {
      const data = page.structuredData;
      let id = 0;

      index.add({
        id: page.id,
        page_id: page.id,
        type: 'page',
        content: page.title,
        keywords: page.keywords,
        tag: page.tag,
        url: page.url,
      });

      if (page.description) {
        index.add({
          id: page.id + (id++).toString(),
          page_id: page.id,
          tag: page.tag,
          type: 'text',
          url: page.url,
          content: page.description,
        });
      }

      for (const heading of data.headings) {
        index.add({
          id: page.id + (id++).toString(),
          page_id: page.id,
          type: 'heading',
          tag: page.tag,
          url: `${page.url}#${heading.id}`,
          content: heading.content,
        });
      }

      for (const content of data.contents) {
        index.add({
          id: page.id + (id++).toString(),
          page_id: page.id,
          tag: page.tag,
          type: 'text',
          url: content.heading ? `${page.url}#${content.heading}` : page.url,
          content: content.content,
        });
      }
    }

    return index;
  }

  const doc = getDocument();

  return createEndpoint(async (query, options) => {
    const index = await doc;
    const results = index.search(query, 5, {
      enrich: true,
      tag: options?.tag,
      limit: 6,
    });

    const map = new Map<string, SortedResult[]>();

    for (const item of results[0]?.result ?? []) {
      if (item.doc.type === 'page') {
        if (!map.has(item.doc.id)) {
          map.set(item.doc.id, []);
        }

        continue;
      }

      const list = map.get(item.doc.page_id) ?? [];

      list.push({
        id: item.doc.id,
        content: item.doc.content,
        type: item.doc.type,
        url: item.doc.url,
      });

      map.set(item.doc.page_id, list);
    }

    const sortedResult: SortedResult[] = [];
    for (const [id, items] of map.entries()) {
      const page = (
        index as unknown as {
          get: (id: string) => InternalIndex | null;
        }
      ).get(id);

      if (!page) continue;

      sortedResult.push({
        id: page.id,
        content: page.content,
        type: 'page',
        url: page.url,
      });
      sortedResult.push(...items);
    }

    return sortedResult;
  });
}

// TODO: Use new i18n API (major)
export { createI18nSearchAPI as createI18nSearchAPIExperimental } from './i18n-api';
export { createI18nSearchAPI } from './legacy-i18n-api';
