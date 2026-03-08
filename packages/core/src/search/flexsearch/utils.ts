import Search, { type DocumentOptions, type Document, type DocumentData } from 'flexsearch';
import { createContentHighlighter, type SortedResult } from '..';
import type { SharedDocument } from '../server/build-doc';

export type Doc = SharedDocument & DocumentData;

export async function search(index: Document<Doc>, query: string, tag?: string | string[]) {
  const arr = await index.searchAsync(query, {
    index: 'content',
    limit: 60,
    tag: tag
      ? ({
          tags: tag,
        } as Record<string, string>)
      : undefined,
  });
  const out: SortedResult[] = [];
  if (arr.length === 0) return out;

  const results = arr[0].result;
  const highlighter = createContentHighlighter(query);
  // page id -> heading/content item
  const grouped = new Map<string, Doc[]>();

  for (const id of results) {
    const doc = index.get(id);
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
    const page = index.get(page_id);
    if (!page) continue;

    out.push({
      id: page_id,
      type: 'page',
      content: highlighter.highlightMarkdown(page.content),
      breadcrumbs: page.breadcrumbs,
      url: page.url,
    });

    for (const item of items) {
      out.push({
        id: item.id,
        content: highlighter.highlightMarkdown(item.content),
        breadcrumbs: item.breadcrumbs,
        type: item.type,
        url: item.url,
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
