import type { SearchAPI } from './server';
import Search, { type DocumentData } from 'flexsearch';
import { createEndpoint } from './server/endpoint';
import { buildBreadcrumbsDefault, buildIndexDefault, type SharedIndex } from './server/build-index';
import { buildDocuments, type SharedDocument } from './server/build-doc';
import { createContentHighlighter, type SortedResult } from '.';
import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import type { Awaitable } from '@/types';

export type Index = SharedIndex;

type Doc = SharedDocument & DocumentData;

export interface Options {
  indexes: Index[] | (() => Awaitable<Index[]>);
}

export function flexsearch(options: Options): SearchAPI {
  function initIndex(indexes: Index[]) {
    const index = new Search.Document<Doc>({
      tokenize: 'full',
      document: {
        id: 'id',
        index: ['content'],
        store: true,
      },
    });

    for (const doc of buildDocuments(indexes)) {
      index.add(doc.id, doc as Doc);
    }

    return index;
  }

  const indexPromise =
    typeof options.indexes === 'function'
      ? Promise.resolve(options.indexes()).then(initIndex)
      : initIndex(options.indexes);

  return createEndpoint({
    async export() {
      const map = new Map<string, unknown>();
      (await indexPromise).export((key, data) => {
        map.set(key, data);
      });
      return map;
    },
    async search(query) {
      const index = await indexPromise;
      const arr = await index.searchAsync(query, {
        index: 'content',
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
    },
  });
}

export interface FromSourceOptions<C extends LoaderConfig> {
  buildIndex?: (page: Page<C['source']['pageData']>) => Awaitable<Index>;
}

export function flexsearchFromSource<C extends LoaderConfig>(
  loader: LoaderOutput<C>,
  options: FromSourceOptions<NoInfer<C>> = {},
) {
  const { buildIndex = buildIndexDefault } = options;

  return flexsearch({
    indexes() {
      return Promise.all(
        loader.getPages().map(async (page) => {
          const index = await buildIndex(page);
          if (index.breadcrumbs) return index;
          return { ...index, breadcrumbs: buildBreadcrumbsDefault(loader, page) };
        }),
      );
    },
  });
}
