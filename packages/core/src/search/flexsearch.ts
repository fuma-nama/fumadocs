import type { SearchAPI, SearchServer } from './server';
import Search, { type DocumentOptions } from 'flexsearch';
import { createEndpoint } from './server/endpoint';
import { buildIndexDefault, createBreadcrumbs, type SharedIndex } from './server/build-index';
import { buildDocuments } from './server/build-doc';
import type { LoaderConfig, LoaderOutput } from '@/source';
import type { Awaitable } from '@/types';
import type { I18nConfig } from '@/i18n';
import { createDocument, search, toSearchIndex, type Doc } from './flexsearch/utils';

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
    const document = createDocument(options.document);
    const docs = buildDocuments(indexes);

    for (let key = 0; key < docs.length; key++) {
      document.add(key, docs[key] as Doc);
    }

    return toSearchIndex(document);
  }

  const indexPromise =
    typeof options.indexes === 'function'
      ? Promise.resolve(options.indexes()).then(initIndex)
      : initIndex(options.indexes);

  return {
    async export(): Promise<ExportedData> {
      const index = await indexPromise;
      const raw: Record<string, string> = {};
      index.document.export((key, data) => {
        raw[key] = data;
      });
      return { type: 'default', raw };
    },
    async search(query, searchOptions) {
      return search(await indexPromise, query, searchOptions?.tag, searchOptions?.limit);
    },
  };
}

/** a server for each locale, built on its first use */
function localeServers(
  i18n: I18nConfig,
  getIndexes: (locale: string) => Awaitable<Index[]>,
  { localeMap, document }: Omit<I18nOptions, 'i18n' | 'indexes'>,
): SearchServer {
  const servers = new Map<string, SearchServer>();

  function get(locale: string): SearchServer {
    let localeServer = servers.get(locale);
    if (!localeServer) {
      const override = localeMap?.[locale];
      localeServer = server({
        indexes: () => getIndexes(locale),
        document:
          override === 'cjk'
            ? { ...document, encoder: Search.Charset.CJK }
            : { ...document, ...override },
      });
      servers.set(locale, localeServer);
    }
    return localeServer;
  }

  return {
    async export(): Promise<ExportedData> {
      const entries = i18n.languages.map(async (locale) => {
        const data = (await get(locale).export()) as Extract<ExportedData, { type: 'default' }>;
        return [locale, data.raw];
      });

      return {
        type: 'i18n',
        raw: Object.fromEntries(await Promise.all(entries)),
      };
    },
    async search(query, searchOptions) {
      const locale = searchOptions?.locale ?? i18n.defaultLanguage;
      if (!i18n.languages.includes(locale)) return [];
      return get(locale).search(query, searchOptions);
    },
  };
}

function serverI18n({ i18n, indexes, ...options }: I18nOptions): SearchServer {
  const indexMap = Promise.resolve(typeof indexes === 'function' ? indexes() : indexes).then(
    (list) => {
      const map = new Map<string, IndexWithLocale[]>();
      for (const index of list) {
        const items = map.get(index.locale);
        if (items) items.push(index);
        else map.set(index.locale, [index]);
      }
      return map;
    },
  );

  return localeServers(i18n, async (locale) => (await indexMap).get(locale) ?? [], options);
}

export function flexsearch(options: Options): SearchAPI {
  return createEndpoint(server(options));
}

export function flexsearchI18n(options: I18nOptions): SearchAPI {
  return createEndpoint(serverI18n(options));
}

export interface FromSourceOptions<C extends LoaderConfig> extends Pick<
  I18nOptions,
  'localeMap' | 'document'
> {
  buildIndex?: (page: C['page']) => Awaitable<Index>;
}

/**
 * create server from loader, if passed as function, the server will re-index all records once a different instance of loader is returned.
 */
export function flexsearchFromSource<C extends LoaderConfig>(
  loader: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  options: FromSourceOptions<NoInfer<C>> = {},
) {
  const cache = new WeakMap<LoaderOutput<C>, SearchServer>();
  const { buildIndex = buildIndexDefault, ...rest } = options;

  function initServer(loader: LoaderOutput<C>): SearchServer {
    const getBreadcrumbs = createBreadcrumbs(loader);
    const getIndexes = (locale?: string) =>
      Promise.all(
        loader.getPages(locale).map(async (page): Promise<Index> => {
          const index = await buildIndex(page);
          return { ...index, breadcrumbs: index.breadcrumbs ?? getBreadcrumbs(page) };
        }),
      );

    if (loader._i18n) return localeServers(loader._i18n, getIndexes, rest);
    return server({ indexes: () => getIndexes(), ...rest });
  }

  async function getCurrentServer() {
    const l = typeof loader === 'function' ? await loader() : loader;
    let server = cache.get(l);
    if (!server) {
      server = initServer(l);
      cache.set(l, server);
    }
    return server;
  }

  return createEndpoint({
    async export() {
      return (await getCurrentServer()).export();
    },
    async search(query, options) {
      return (await getCurrentServer()).search(query, options);
    },
  });
}
