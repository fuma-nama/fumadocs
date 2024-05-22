import { Document } from 'flexsearch';
import { type NextRequest, NextResponse } from 'next/server';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { SortedResult } from './shared';

interface SearchAPI {
  GET: (request: NextRequest) => NextResponse<SortedResult[]>;

  search: (
    query: string,
    options?: { locale?: string; tag?: string },
  ) => SortedResult[];
}

interface SimpleOptions {
  indexes: Index[];
  language?: string;
}

interface AdvancedOptions {
  indexes: AdvancedIndex[];
  /**
   * Enabled custom tags
   */
  tag?: boolean;
  language?: string;
}

type ToI18n<T extends { indexes: unknown }> = Omit<
  T,
  'indexes' | 'language'
> & {
  indexes: (
    | [language: string, indexes: T['indexes']]
    | {
        language: string;
        indexes: T['indexes'];
      }
  )[];
};

function create(search: SearchAPI['search']): SearchAPI {
  return {
    search,
    GET(request) {
      const query = request.nextUrl.searchParams.get('query');
      if (!query) return NextResponse.json([]);

      return NextResponse.json(
        search(query, {
          tag: request.nextUrl.searchParams.get('tag') ?? undefined,
          locale: request.nextUrl.searchParams.get('locale') ?? undefined,
        }),
      );
    },
  };
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

export function createI18nSearchAPI<T extends 'simple' | 'advanced'>(
  type: T,
  options: T extends 'simple' ? ToI18n<SimpleOptions> : ToI18n<AdvancedOptions>,
): SearchAPI {
  const map = new Map<string, SearchAPI>();

  for (const entry of options.indexes) {
    const v = Array.isArray(entry)
      ? { language: entry[0], indexes: entry[1] }
      : entry;

    map.set(
      v.language,
      createSearchAPI(type, {
        ...options,
        language: v.language,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment -- Avoid complicated types
        indexes: v.indexes as any,
      }),
    );
  }

  return create((query, searchOptions) => {
    if (searchOptions?.locale) {
      const handler = map.get(searchOptions.locale);

      if (handler) return handler.search(query, searchOptions);
    }

    return [];
  });
}

export interface Index {
  title: string;
  content: string;
  url: string;
  keywords?: string;
}

export function initSearchAPI({ indexes, language }: SimpleOptions): SearchAPI {
  const store = ['title', 'url'];
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

  for (const page of indexes) {
    index.add({
      title: page.title,
      url: page.url,
      content: page.content,
      keywords: page.keywords,
    });
  }

  return create((query) => {
    const results = index.search(query, 5, {
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
  /**
   * Required if `tag` is enabled
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
  tag?: string;
  content: string;
}

export function initSearchAPIAdvanced({
  indexes,
  language,
  tag = false,
}: AdvancedOptions): SearchAPI {
  const store = ['id', 'url', 'content', 'page_id', 'type'];
  const index = new Document<InternalIndex, typeof store>({
    language,
    cache: 100,
    tokenize: 'forward',
    optimize: true,
    context: {
      depth: 2,
      bidirectional: true,
      resolution: 9,
    },
    document: {
      id: 'id',
      tag: tag ? 'tag' : undefined,
      store,
      index: ['content'],
    },
  });

  for (const page of indexes) {
    const data = page.structuredData;
    let id = 0;

    index.add({
      id: page.id,
      page_id: page.id,
      type: 'page',
      content: page.title,
      tag: page.tag,
      url: page.url,
    });

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

  return create((query, options) => {
    const results = index.search(query, 5, {
      enrich: true,
      tag: options?.tag,
      limit: 6,
    });

    const map = new Map<string, SortedResult[]>();
    const sortedResult: SortedResult[] = [];

    for (const item of results[0]?.result ?? []) {
      if (item.doc.type === 'page') {
        if (!map.has(item.doc.page_id)) {
          map.set(item.doc.page_id, []);
        }

        continue;
      }

      const i: SortedResult = {
        id: item.doc.id,
        content: item.doc.content,
        type: item.doc.type,
        url: item.doc.url,
      };

      if (map.has(item.doc.page_id)) {
        map.get(item.doc.page_id)?.push(i);
      } else {
        map.set(item.doc.page_id, [i]);
      }
    }

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
