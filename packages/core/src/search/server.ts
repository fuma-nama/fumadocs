import {
  type Orama,
  type SearchParams,
  type DefaultTokenizerConfig,
  type Tokenizer,
  type OramaPlugin,
  type SorterConfig,
  save,
} from '@orama/orama';
import { type NextRequest } from 'next/server';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { SortedResult } from '@/server/types';
import { createEndpoint } from '@/search/create-endpoint';
import {
  type AdvancedDocument,
  type advancedSchema,
  createDB,
} from '@/search/create-db';
import { searchSimple } from '@/search/search/simple';
import { searchAdvanced } from '@/search/search/advanced';
import {
  createDBSimple,
  type schema,
  type SimpleDocument,
} from './create-db-simple';

export interface SearchServer {
  search: (
    query: string,
    options?: { locale?: string; tag?: string },
  ) => Promise<SortedResult[]>;

  /**
   * Export the database
   *
   * You can reference the exported database to implement client-side search
   */
  export: () => Promise<unknown>;
}

export interface SearchAPI extends SearchServer {
  GET: (request: NextRequest) => Promise<Response>;

  /**
   * `GET` route handler that exports search indexes for static search.
   */
  staticGET: () => Promise<Response>;
}

/**
 * Resolve indexes dynamically
 */
export type Dynamic<T> = () => T[] | Promise<T[]>;

interface SharedOptions {
  language?: string;

  sort?: SorterConfig;
  tokenizer?: Tokenizer | DefaultTokenizerConfig;
  plugins?: OramaPlugin[];
}

export interface SimpleOptions extends SharedOptions {
  indexes: Index[] | Dynamic<Index>;

  /**
   * Customise search options on server
   */
  search?: Partial<SearchParams<Orama<typeof schema>, SimpleDocument>>;
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

export function createSearchAPI<T extends 'simple' | 'advanced'>(
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
        ...(await save(await doc)),
      };
    },
    search: async (query) => {
      const db = await doc;

      return searchSimple(db, query, options.search);
    },
  };
}

export interface AdvancedIndex {
  id: string;
  title: string;
  description?: string;

  keywords?: string;

  /**
   * Required if tag filter is enabled
   */
  tag?: string;
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
        ...(await save(await get)),
      };
    },
    search: async (query, searchOptions) => {
      const db = await get;

      return searchAdvanced(db, query, searchOptions?.tag, options.search);
    },
  };
}

export { createFromSource } from './create-from-source';
export { createI18nSearchAPI } from './i18n-api';
