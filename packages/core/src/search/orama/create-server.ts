import {
  create,
  Orama,
  RawData,
  save,
  SearchParams,
  type Language,
  type Tokenizer,
} from '@orama/orama';
import type { SearchAPI, SearchServer } from '@/search/server';
import type { I18nConfig } from '@/i18n';
import { STEMMERS } from '@/search/orama/_stemmers';
import { createEndpoint } from '../server/endpoint';
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
import type { SharedIndex } from '../server/build-index';

type OramaInput = Parameters<typeof create>[0];

type SharedOptions = Pick<OramaInput, 'sort' | 'components' | 'plugins'> & {
  language?: string;
  tokenizer?: Required<OramaInput>['components']['tokenizer'];
};

/**
 * Resolve indexes dynamically
 */
export type Dynamic<T> = () => T[] | Promise<T[]>;

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

export function initSimpleSearch(options: SimpleOptions): SearchServer {
  const doc = createDBSimple(options);

  return {
    async export() {
      return {
        type: 'simple',
        ...save(await doc),
      };
    },
    async search(query) {
      const db = await doc;

      return searchSimple(db, query, options.search);
    },
  };
}

export type AdvancedIndex = SharedIndex;

export function initAdvancedSearch(options: AdvancedOptions): SearchServer {
  const get = createDB(options);

  return {
    async export() {
      return {
        type: 'advanced',
        ...save(await get),
      };
    },
    async search(query, searchOptions) {
      const db = await get;
      const mode = searchOptions?.mode;

      return searchAdvanced(db, query, searchOptions?.tag, {
        ...options.search,
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

export function createSearchAPI(type: 'simple', options: SimpleOptions): SearchAPI;
export function createSearchAPI(type: 'advanced', options: AdvancedOptions): SearchAPI;

export function createSearchAPI(
  ...args: ['simple', SimpleOptions] | ['advanced', AdvancedOptions]
): SearchAPI {
  if (args[0] === 'simple') {
    return createEndpoint(initSimpleSearch(args[1]));
  }

  return createEndpoint(initAdvancedSearch(args[1]));
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

export function createI18nSearchAPI(type: 'simple', options: I18nSimpleOptions): SearchAPI;
export function createI18nSearchAPI(type: 'advanced', options: I18nAdvancedOptions): SearchAPI;

export function createI18nSearchAPI(
  ...[type, options]: ['simple', I18nSimpleOptions] | ['advanced', I18nAdvancedOptions]
): SearchAPI {
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
  return createEndpoint({
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
