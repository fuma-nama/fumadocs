import type { SearchAPI, SearchServer } from './server';
import Search, { type DocumentOptions } from 'flexsearch';
import { createEndpoint } from './server/endpoint';
import { buildBreadcrumbs, buildIndexDefault, type SharedIndex } from './server/build-index';
import { buildDocuments } from './server/build-doc';
import type { LoaderConfig, LoaderOutput, Page } from '@/source';
import type { Awaitable } from '@/types';
import type { I18nConfig } from '@/i18n';
import { createDocument, search, type Doc } from './flexsearch/utils';

export type Index = SharedIndex;
export interface IndexWithLocale extends Index {
  locale: string;
}

export interface Options {
  indexes: Index[] | (() => Awaitable<Index[]>);
  document?: DocumentOptions<Doc>;
}

export type ExportedData =
  | {
      type: 'default';
      raw: Record<string, string>;
    }
  | {
      type: 'i18n';
      raw: Record<string, Record<string, string>>;
    };

export interface I18nOptions extends Omit<Options, 'indexes'> {
  i18n: I18nConfig;
  indexes: IndexWithLocale[] | (() => Awaitable<IndexWithLocale[]>);

  /**
   * options for each locale, see https://github.com/nextapps-de/flexsearch/blob/master/doc/encoder.md.
   */
  localeMap?: Record<string, Partial<DocumentOptions<Doc>> | 'cjk'>;
}

function server(options: Options): SearchServer {
  function initIndex(indexes: Index[]) {
    const index = createDocument(options.document);

    for (const doc of buildDocuments(indexes)) {
      index.add(doc.id, doc as Doc);
    }

    return index;
  }

  const indexPromise =
    typeof options.indexes === 'function'
      ? Promise.resolve(options.indexes()).then(initIndex)
      : initIndex(options.indexes);

  return {
    async export(): Promise<ExportedData> {
      const index = await indexPromise;
      const raw: Record<string, string> = {};
      index.export((key, data) => {
        raw[key] = data;
      });
      return { type: 'default', raw };
    },
    async search(query, searchOptions) {
      return search(await indexPromise, query, searchOptions?.tag, searchOptions?.limit);
    },
  };
}

export function flexsearch(options: Options): SearchAPI {
  return createEndpoint(server(options));
}

export function flexsearchI18n(options: I18nOptions): SearchAPI {
  const { indexes: inputIndexes, localeMap } = options;

  async function initSearchServers() {
    const map = new Map<string, SearchServer>();
    const indexMap = new Map<string, IndexWithLocale[]>();
    const indexes = typeof inputIndexes === 'function' ? await inputIndexes() : inputIndexes;

    for (const index of indexes) {
      let list = indexMap.get(index.locale);
      if (!list) {
        list = [];
        indexMap.set(index.locale, list);
      }
      list.push(index);
    }

    for (const [locale, list] of indexMap) {
      const override = localeMap?.[locale];

      map.set(
        locale,
        server({
          indexes: list,
          document:
            override === 'cjk'
              ? { ...options.document, encoder: Search.Charset.CJK }
              : { ...options.document, ...override },
        }),
      );
    }

    return map;
  }

  const get = initSearchServers();
  return createEndpoint({
    async export(): Promise<ExportedData> {
      const map = await get;
      const entries = Array.from(map.entries()).map(async ([k, v]) => {
        const data = (await v.export()) as Extract<ExportedData, { type: 'default' }>;
        return [k, data.raw];
      });

      return {
        type: 'i18n',
        raw: Object.fromEntries(await Promise.all(entries)),
      };
    },
    async search(query, searchOptions) {
      const map = await get;
      const handler = map.get(searchOptions?.locale ?? options.i18n.defaultLanguage);

      if (handler) return handler.search(query, searchOptions);
      return [];
    },
  });
}

export interface FromSourceOptions<C extends LoaderConfig> extends Pick<
  I18nOptions,
  'localeMap' | 'document'
> {
  buildIndex?: (page: Page<C['source']['pageData']>) => Awaitable<Index>;
}

export function flexsearchFromSource<C extends LoaderConfig>(
  loader: LoaderOutput<C>,
  options: FromSourceOptions<NoInfer<C>> = {},
) {
  const { buildIndex = buildIndexDefault, ...rest } = options;
  function indexes(): Promise<IndexWithLocale[]> {
    return Promise.all(
      loader.getPages().map(async (page) => {
        const index = await buildIndex(page);
        return {
          ...index,
          locale: page.locale!,
          breadcrumbs: index.breadcrumbs ?? buildBreadcrumbs(loader, page),
        };
      }),
    );
  }

  if (loader._i18n) {
    return flexsearchI18n({
      indexes,
      i18n: loader._i18n,
      ...rest,
    });
  }

  return flexsearch({
    indexes,
    ...rest,
  });
}
