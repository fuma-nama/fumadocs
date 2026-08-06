import {
  create,
  save,
  type Language,
  type RawData,
  type SearchParams,
  type ZBSearch,
} from 'zbsearch';
import type { QueryOptions, SearchAPI, SearchServer } from '@/search/server';
import type { I18nConfig } from '@/i18n';
import { createEndpoint, defaultReadOptions } from '../server/endpoint';
import {
  AdvancedDocument,
  advancedSchema,
  createDB,
  createDBSimple,
  SimpleDocument,
  simpleSchema,
} from './create-db';
import { searchSimple } from './search/simple';
import { searchAdvanced } from './search/advanced';
import { buildBreadcrumbs, buildIndexDefault, type SharedIndex } from '../server/build-index';
import type { LoaderConfig, LoaderOutput } from '@/source/loader';
import type { Awaitable } from '@/types';

type CreateInput = Parameters<typeof create>[0];

interface SharedOptions extends Pick<CreateInput, 'sort' | 'components' | 'plugins'> {
  /**
   * Tokenizer language.
   *
   * @defaultValue 'multilingual' - works with every language, zero config needed.
   */
  language?: string;
  tokenizer?: Required<CreateInput>['components']['tokenizer'];

  /**
   * Filter search results by the `locale` query option, requires indexes to include a `locale` property.
   *
   * Enabled automatically by i18n search servers.
   */
  localeFilter?: boolean;
}

interface EngineQueryOptions extends QueryOptions {
  mode?: 'full' | 'vector';
}

/**
 * Resolve indexes dynamically
 */
type Dynamic<T> = () => Awaitable<T[]>;

export interface SimpleOptions extends SharedOptions {
  indexes: Index[] | Dynamic<Index>;

  /**
   * Customize search options on server
   */
  search?: Partial<SearchParams<ZBSearch<typeof simpleSchema>, SimpleDocument>>;
}

export interface AdvancedOptions extends SharedOptions {
  indexes: AdvancedIndex[] | Dynamic<AdvancedIndex>;

  /**
   * Customize search options on server
   */
  search?: Partial<SearchParams<ZBSearch<typeof advancedSchema>, AdvancedDocument>>;
}

export interface Index {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  content: string;
  url: string;
  keywords?: string;
  locale?: string;
}

export type ExportedData =
  | (RawData & { type: 'simple' | 'advanced'; i18n?: boolean })
  | {
      type: 'i18n';
      data: Record<string, RawData & { type: 'simple' | 'advanced' }>;
    };

export function initSimpleSearch(options: SimpleOptions): SearchServer<EngineQueryOptions> {
  const doc = createDBSimple(options);

  return {
    async export() {
      return {
        type: 'simple',
        ...(options.localeFilter ? { i18n: true } : null),
        ...save(await doc),
      };
    },
    async search(query, searchOptions = {}) {
      const db = await doc;
      const { limit, locale } = searchOptions;

      return searchSimple(
        db,
        query,
        {
          limit,
          ...options.search,
        },
        options.localeFilter && locale ? locale : undefined,
      );
    },
  };
}

export type AdvancedIndex = SharedIndex;

export function initAdvancedSearch(options: AdvancedOptions): SearchServer<EngineQueryOptions> {
  const get = createDB(options);

  return {
    async export() {
      return {
        type: 'advanced',
        ...(options.localeFilter ? { i18n: true } : null),
        ...save(await get),
      };
    },
    async search(query, searchOptions = {}) {
      const db = await get;
      const { limit, tag, mode, locale } = searchOptions;

      return searchAdvanced(
        db,
        query,
        tag,
        {
          ...options.search,
          limit,
          mode: mode === 'vector' ? 'vector' : 'fulltext',
        },
        options.localeFilter && locale ? locale : undefined,
      ).catch((err) => {
        if (mode === 'vector') {
          throw new Error(
            'failed to search, make sure your indexes include `embeddings` and a plugin/proxy is configured to vectorize search terms.',
            {
              cause: err,
            },
          );
        }

        throw err;
      });
    },
  };
}

export function createSearchAPI(
  type: 'simple',
  options: SimpleOptions,
): SearchAPI<EngineQueryOptions>;
export function createSearchAPI(
  type: 'advanced',
  options: AdvancedOptions,
): SearchAPI<EngineQueryOptions>;

export function createSearchAPI(
  ...args: ['simple', SimpleOptions] | ['advanced', AdvancedOptions]
): SearchAPI<EngineQueryOptions> {
  return toAPI(args[0] === 'simple' ? initSimpleSearch(args[1]) : initAdvancedSearch(args[1]));
}

type I18nOptions<O extends SimpleOptions | AdvancedOptions, Idx> = Omit<
  O,
  'language' | 'indexes'
> & {
  i18n: I18nConfig;

  /**
   * Map locale name from i18n config to a compatible `language` or options.
   *
   * @deprecated No longer needed - the default `multilingual` tokenizer supports every language with zero config.
   * When specified, a separate database is created for each locale (legacy behaviour).
   */
  localeMap?: Record<string, Language | Partial<O> | undefined>;

  indexes: WithLocale<Idx>[] | Dynamic<WithLocale<Idx>>;
};

type I18nSimpleOptions = I18nOptions<SimpleOptions, Index>;
type I18nAdvancedOptions = I18nOptions<AdvancedOptions, AdvancedIndex>;

type WithLocale<T> = T & {
  locale: string;
};

export function createI18nSearchAPI(
  type: 'simple',
  options: I18nSimpleOptions,
): SearchAPI<EngineQueryOptions>;
export function createI18nSearchAPI(
  type: 'advanced',
  options: I18nAdvancedOptions,
): SearchAPI<EngineQueryOptions>;

export function createI18nSearchAPI(
  ...[type, options]: ['simple', I18nSimpleOptions] | ['advanced', I18nAdvancedOptions]
): SearchAPI<EngineQueryOptions> {
  if (options.localeMap) return createI18nSearchAPILegacy(type, options);

  const server =
    type === 'simple'
      ? initSimpleSearch({
          ...options,
          localeFilter: true,
        } as SimpleOptions)
      : initAdvancedSearch({
          ...options,
          localeFilter: true,
        } as AdvancedOptions);

  return toAPI({
    export: server.export,
    async search(query, searchOptions) {
      return server.search(query, {
        ...searchOptions,
        locale: searchOptions?.locale ?? options.i18n.defaultLanguage,
      });
    },
  });
}

function createI18nSearchAPILegacy(
  type: 'simple' | 'advanced',
  options: I18nSimpleOptions | I18nAdvancedOptions,
): SearchAPI<EngineQueryOptions> {
  async function initSearchServers() {
    const map = new Map<string, SearchServer<EngineQueryOptions>>();
    if (options.i18n.languages.length === 0) {
      return map;
    }

    const indexes =
      typeof options.indexes === 'function' ? await options.indexes() : options.indexes;

    for (const locale of options.i18n.languages) {
      const localeIndexes = indexes.filter((index) => index.locale === locale);
      const mapped = options.localeMap?.[locale] ?? 'multilingual';

      if (type === 'simple') {
        map.set(
          locale,
          typeof mapped === 'object'
            ? initSimpleSearch({
                ...options,
                ...mapped,
                indexes: localeIndexes,
              } as SimpleOptions)
            : initSimpleSearch({
                ...options,
                language: mapped,
                indexes: localeIndexes,
              } as SimpleOptions),
        );
      } else {
        map.set(
          locale,
          typeof mapped === 'object'
            ? initAdvancedSearch({
                ...options,
                indexes: localeIndexes,
                ...mapped,
              } as AdvancedOptions)
            : initAdvancedSearch({
                ...options,
                language: mapped,
                indexes: localeIndexes,
              } as AdvancedOptions),
        );
      }
    }

    return map;
  }

  const get = initSearchServers();
  return toAPI({
    async export() {
      const map = await get;
      const entries = Array.from(map.entries()).map(async ([k, v]) => [k, await v.export()]);

      return {
        type: 'i18n',
        data: Object.fromEntries(await Promise.all(entries)),
      };
    },
    async search(query, searchOptions) {
      const map = await get;
      const locale = searchOptions?.locale ?? options.i18n.defaultLanguage;
      const handler = map.get(locale);

      if (handler) return handler.search(query, searchOptions);
      return [];
    },
  });
}

interface Options<C extends LoaderConfig> extends Omit<AdvancedOptions, 'indexes'> {
  /**
   * @deprecated No longer needed - the default `multilingual` tokenizer supports every language with zero config.
   */
  localeMap?: {
    [K in C['i18n'] extends I18nConfig<infer Languages> ? Languages : string]?:
      | Partial<AdvancedOptions>
      | Language;
  };
  buildIndex?: (page: C['page']) => Awaitable<AdvancedIndex>;
}

/**
 * create server from loader, if passed as function, the server will re-index all records once a different instance of loader is returned.
 */
export function createFromSource<C extends LoaderConfig = LoaderConfig>(
  loader: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  options: Options<C> = {},
): SearchAPI<EngineQueryOptions> {
  const { buildIndex = buildIndexDefault } = options;
  const cache = new WeakMap<LoaderOutput<C>, Promise<SearchServer<EngineQueryOptions>>>();

  async function initServer(loader: LoaderOutput<C>) {
    const indexes = await Promise.all(
      loader.getPages().map(async (page) => {
        const index = await buildIndex(page);
        return {
          ...index,
          breadcrumbs: index.breadcrumbs ?? buildBreadcrumbs(loader, page),
          locale: page.locale,
        };
      }),
    );

    if (loader._i18n) {
      return createI18nSearchAPI('advanced', {
        ...options,
        indexes: indexes as WithLocale<AdvancedIndex>[],
        i18n: loader._i18n,
      });
    }

    return initAdvancedSearch({
      indexes,
      ...options,
    });
  }

  async function getCurrentServer() {
    const l = typeof loader === 'function' ? await loader() : loader;
    let server = cache.get(l);
    if (!server) {
      server = initServer(l);
      cache.set(l, server);
    }
    return await server;
  }

  return toAPI({
    async export() {
      return (await getCurrentServer()).export();
    },
    async search(query, options) {
      return (await getCurrentServer()).search(query, options);
    },
  });
}

function toAPI(server: SearchServer<EngineQueryOptions>): SearchAPI<EngineQueryOptions> {
  return createEndpoint(server, {
    readOptions(url) {
      return {
        ...defaultReadOptions(url),
        mode: url.searchParams.get('mode') === 'vector' ? 'vector' : 'full',
      };
    },
  });
}
