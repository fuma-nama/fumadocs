import Search, { type DocumentOptions, type Document, type DocumentData } from 'flexsearch';
import type { SortedResult } from '..';
import type { SharedDocument } from '../server/build-doc';

export type Doc = SharedDocument & DocumentData;

export interface SearchIndex {
  /**
   * documents are keyed by their position, the exported index repeats the key for every indexed substring
   */
  document: Document<Doc>;
  /** page id -> page document */
  pages: Map<string, Doc>;
}

export function toSearchIndex(document: Document<Doc>): SearchIndex {
  const pages = new Map<string, Doc>();
  for (let key = 0, doc = document.get(key); doc; doc = document.get(++key)) {
    if (doc.type === 'page') pages.set(doc.id, doc);
  }
  return { document, pages };
}

export async function search(
  { document, pages }: SearchIndex,
  query: string,
  tag?: string | string[],
  limit = 60,
) {
  const arr = await document.searchAsync(query, {
    index: 'content',
    limit,
    tag: tag
      ? ({
          tags: tag,
        } as Record<string, string>)
      : undefined,
  });
  const out: SortedResult[] = [];
  if (arr.length === 0) return out;

  const results = arr[0].result;
  // page id -> heading/content item
  const grouped = new Map<string, Doc[]>();

  for (const key of results) {
    const doc = document.get(key);
    if (!doc) continue;
    let list = grouped.get(doc.page_id);
    if (!list) {
      list = [];
      grouped.set(doc.page_id, list);
    }

    if (doc.type !== 'page') {
      list.push(doc);
    }
  }

  for (const [page_id, items] of grouped) {
    const page = pages.get(page_id);
    if (!page) continue;

    out.push({
      id: page_id,
      type: 'page',
      content: page.content,
      breadcrumbs: page.breadcrumbs,
      url: page.url,
    });

    for (const item of items) {
      out.push({
        id: item.id,
        content: item.content,
        breadcrumbs: item.breadcrumbs,
        type: item.type,
        url: item.url,
        table: item.table,
      });
    }
  }

  return out;
}

export function createDocument(options?: DocumentOptions<Doc>) {
  return new Search.Document<Doc>({
    tokenize: 'full',
    ...options,
    document: {
      id: 'id',
      index: ['content'],
      tag: ['tags'],
      store: true,
      ...options?.document,
    },
  });
}
