import {
  create,
  type Orama,
  type RawData,
  save,
  type SearchParams,
} from '@orama/orama';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import { createEndpoint } from '@/search/orama/create-endpoint';
import {
  type AdvancedDocument,
  type advancedSchema,
  createDB,
  createDBSimple,
  type SimpleDocument,
  simpleSchema,
} from '@/search/orama/create-db';
import { searchSimple } from '@/search/orama/search/simple';
import { searchAdvanced } from '@/search/orama/search/advanced';
import type { SortedResult } from '@/search/shared';

type SearchType = 'simple' | 'advanced';

export type ExportedData =
  | (RawData & { type: SearchType })
  | {
      type: 'i18n';
      data: Record<string, RawData & { type: SearchType }>;
    };

export interface SearchServer {
  search: (
    query: string,
    options?: { locale?: string; tag?: string | string[] },
  ) => Promise<SortedResult[]>;

  /**
   * Export the database
   *
   * You can reference the exported database to implement client-side search
   */
  export: () => Promise<ExportedData>;
}

export interface SearchAPI extends SearchServer {
  GET: (request: Request) => Promise<Response>;

  /**
   * `GET` route handler that exports search indexes for static search.
   */
  staticGET: () => Promise<Response>;
}

/**
 * Resolve indexes dynamically
 */
export type Dynamic<T> = () => T[] | Promise<T[]>;

type OramaInput = Parameters<typeof create>[0];

type SharedOptions = Pick<OramaInput, 'sort' | 'components' | 'plugins'> & {
  language?: string;
  tokenizer?: Required<OramaInput>['components']['tokenizer'];
};

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
  search?: Partial<
    SearchParams<Orama<typeof advancedSchema>, AdvancedDocument>
  >;
}

export function createSearchAPI<T extends SearchType>(
  type: T,
  options: T extends 'simple' ? SimpleOptions : AdvancedOptions,
): SearchAPI {
  if (type === 'simple') {
    return createEndpoint(initSimpleSearch(options as SimpleOptions));
  }

  return createEndpoint(initAdvancedSearch(options as AdvancedOptions));
}

export interface Index {
  title: string;
  description?: string;
  content: string;
  url: string;
  keywords?: string;
}

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

export interface AdvancedIndex {
  id: string;
  title: string;
  description?: string;

  /**
   * @deprecated No longer used
   */
  keywords?: string;

  /**
   * Required if tag filter is enabled
   */
  tag?: string | string[];

  /**
   * preprocess mdx content with `structure`
   */
  structuredData: StructuredData;
  url: string;
}

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

      return searchAdvanced(db, query, searchOptions?.tag, options.search);
    },
  };
}

export { createFromSource } from './orama/create-from-source';
export { createI18nSearchAPI } from './orama/create-i18n';
