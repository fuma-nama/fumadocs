import {
  create,
  Orama,
  RawData,
  save,
  SearchParams,
  type Language,
  type Tokenizer,
} from '@orama/orama';
import type { QueryOptions, SearchAPI, SearchServer } from '@/search/server';
import type { I18nConfig } from '@/i18n';
import { STEMMERS } from '@/search/orama/_stemmers';
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

type OramaInput = Parameters<typeof create>[0];

interface SharedOptions extends Pick<OramaInput, 'sort' | 'components' | 'plugins'> {
  language?: string;
  tokenizer?: Required<OramaInput>['components']['tokenizer'];
}

interface OramaQueryOptions extends QueryOptions {
  mode?: 'full' | 'vector';
}

/**
 * Resolve indexes dynamically
 */
type Dynamic<T> = () => Awaitable<T[]>;

export interface SimpleOptions extends SharedOptions {
  indexes: Index[] | Dynamic<Index>;

  /**
   * Customise search options on server
   */
  search?: Partial<SearchParams<Orama<typeof simpleSchema>, SimpleDocument>>;
}

export interface AdvancedOptions extends SharedOptions {
  indexes: AdvancedIndex[] | Dynamic<AdvancedIndex>;

  /**
   * Customise search options on server
   */
  search?: Partial<SearchParams<Orama<typeof advancedSchema>, AdvancedDocument>>;
}

export interface Index {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  content: string;
  url: string;
  keywords?: string;
}

export type ExportedData =
  | (RawData & { type: 'simple' | 'advanced' })
  | {
      type: 'i18n';
      data: Record<string, RawData & { type: 'simple' | 'advanced' }>;
    };

export function initSimpleSearch(options: SimpleOptions): SearchServer<OramaQueryOptions> {
  const doc = createDBSimple(options);

  return {
    async export() {
      return {
        type: 'simple',
        ...save(await doc),
      };
    },
    async search(query, searchOptions = {}) {
      const db = await doc;
      const { limit } = searchOptions;

      return searchSimple(db, query, {
        limit,
        ...options.search,
      });
    },
  };
}

export type AdvancedIndex = SharedIndex;

export function initAdvancedSearch(options: AdvancedOptions): SearchServer<OramaQueryOptions> {
  const get = createDB(options);

  return {
    async export() {
      return {
        type: 'advanced',
        ...save(await get),
      };
    },
    async search(query, searchOptions = {}) {
      const db = await get;
      const { limit, tag, mode } = searchOptions;

      return searchAdvanced(db, query, tag, {
        ...options.search,
        limit,
        mode: mode === 'vector' ? 'vector' : 'fulltext',
      }).catch((err) => {
        if (mode === 'vector') {
          throw new Error(
            'failed to search, make sure you have installed `@orama/plugin-embeddings` according to their docs.',
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
): SearchAPI<OramaQueryOptions>;
export function createSearchAPI(
  type: 'advanced',
  options: AdvancedOptions,
): SearchAPI<OramaQueryOptions>;

export function createSearchAPI(
  ...args: ['simple', SimpleOptions] | ['advanced', AdvancedOptions]
): SearchAPI<OramaQueryOptions> {
  return toAPI(args[0] === 'simple' ? initSimpleSearch(args[1]) : initAdvancedSearch(args[1]));
}

type I18nOptions<O extends SimpleOptions | AdvancedOptions, Idx> = Omit<
  O,
  'language' | 'indexes'
> & {
  i18n: I18nConfig;

  /**
   * Map locale name from i18n config to Orama compatible `language` or options
   */
  localeMap?: Record<string, Language | Partial<O> | undefined>;

  indexes: WithLocale<Idx>[] | Dynamic<WithLocale<Idx>>;
};

type I18nSimpleOptions = I18nOptions<SimpleOptions, Index>;
type I18nAdvancedOptions = I18nOptions<AdvancedOptions, AdvancedIndex>;

type WithLocale<T> = T & {
  locale: string;
};

function getTokenizer(locale: string): { language: string } | { tokenizer: Tokenizer } {
  return {
    language: Object.keys(STEMMERS).find((lang) => STEMMERS[lang] === locale) ?? locale,
  };
}

export function createI18nSearchAPI(
  type: 'simple',
  options: I18nSimpleOptions,
): SearchAPI<OramaQueryOptions>;
export function createI18nSearchAPI(
  type: 'advanced',
  options: I18nAdvancedOptions,
): SearchAPI<OramaQueryOptions>;

export function createI18nSearchAPI(
  ...[type, options]: ['simple', I18nSimpleOptions] | ['advanced', I18nAdvancedOptions]
): SearchAPI<OramaQueryOptions> {
  async function initSearchServers() {
    const map = new Map<string, SearchServer>();
    if (options.i18n.languages.length === 0) {
      return map;
    }

    const indexes =
      typeof options.indexes === 'function' ? await options.indexes() : options.indexes;

    for (const locale of options.i18n.languages) {
      const localeIndexes = indexes.filter((index) => index.locale === locale);
      const mapped = options.localeMap?.[locale] ?? getTokenizer(locale);

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
): SearchAPI<OramaQueryOptions> {
  const { buildIndex = buildIndexDefault } = options;
  const cache = new WeakMap<LoaderOutput<C>, Promise<SearchServer<OramaQueryOptions>>>();

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

function toAPI(server: SearchServer<OramaQueryOptions>): SearchAPI<OramaQueryOptions> {
  return createEndpoint(server, {
    readOptions(url) {
      return {
        ...defaultReadOptions(url),
        mode: url.searchParams.get('mode') === 'vector' ? 'vector' : 'full',
      };
    },
  });
}
