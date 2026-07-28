import { create, load, type AnyZBSearch, type SearchParams, type ZBSearch } from 'zbsearch';
import { searchSimple } from '@/search/zbsearch/search/simple';
import { searchAdvanced } from '@/search/zbsearch/search/advanced';
import type { advancedSchema, simpleSchema } from '@/search/zbsearch/create-db';
import type { ExportedData } from '@/search/server';
import type { SearchClient } from '../client';
import { BASE_PATH, join } from '@/utils/url';

export interface StaticOptions {
  /**
   * Where to download exported search indexes (URL)
   *
   * @defaultValue '/api/search'
   */
  from?: string;

  /**
   * Customize how the search database is initialized (advanced).
   *
   * For legacy per-locale exports, it is called once per locale.
   */
  initDB?: (locale?: string) => AnyZBSearch | Promise<AnyZBSearch>;

  /**
   * @deprecated Renamed to `initDB`, note that the search engine is now ZBSearch.
   */
  initOrama?: (locale?: string) => AnyZBSearch | Promise<AnyZBSearch>;

  /**
   * Filter results with specific tag(s).
   */
  tag?: string | string[];

  /**
   * Filter by locale (for i18n)
   */
  locale?: string;

  /**
   * extra options for search
   */
  search?: Partial<SearchParams<AnyZBSearch>>;
}

const cache = new Map<string, Promise<Database>>();

interface LoadedDB {
  type: 'simple' | 'advanced';
  db: AnyZBSearch;
}

interface Database {
  // locale -> db (legacy per-locale exports, empty key otherwise)
  map: Map<string, LoadedDB>;

  /**
   * a single database is shared by all locales, results can be filtered by their `locale` property.
   */
  unified: boolean;
  i18n: boolean;
}

async function loadDB(
  from: string,
  initDB: NonNullable<StaticOptions['initDB']> = () => create({ schema: { _: 'string' } }),
): Promise<Database> {
  const res = await fetch(from);

  if (!res.ok)
    throw new Error(
      `failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`,
    );

  const data = (await res.json()) as ExportedData;
  const map = new Map<string, LoadedDB>();

  if (data.type === 'i18n') {
    await Promise.all(
      Object.entries(data.data).map(async ([k, v]) => {
        const db = await initDB(k);

        load(db, v);
        map.set(k, {
          type: v.type,
          db,
        });
      }),
    );

    return { map, unified: false, i18n: true };
  }

  const db = await initDB();
  load(db, data);
  map.set('', {
    type: data.type,
    db,
  });

  return { map, unified: true, i18n: data.i18n === true };
}

function getDBCached({
  from = join(BASE_PATH, '/api/search'),
  initDB,
  initOrama,
}: StaticOptions): Promise<Database> {
  const cacheKey = from;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const result = loadDB(from, initDB ?? initOrama);
  cache.set(cacheKey, result);
  return result;
}

export function staticClient(options: StaticOptions = {}): SearchClient {
  const { tag, locale, search } = options;

  return {
    deps: [tag, locale],
    async search(query) {
      const { map, unified, i18n } = await getDBCached(options);
      let db: LoadedDB | undefined;
      let filterLocale: string | undefined;

      if (unified) {
        db = map.get('');
        if (i18n) filterLocale = locale;
      } else {
        db = map.get(locale ?? '');

        if (!db) {
          console.warn(
            `failed to find search data for "${locale}", available: ${Array.from(map.keys())}.`,
          );
          db = map.values().next().value;
        }
      }

      if (!db) return [];
      if (db.type === 'simple')
        return searchSimple(
          db.db as ZBSearch<typeof simpleSchema>,
          query,
          search as never,
          filterLocale,
        );

      return searchAdvanced(
        db.db as ZBSearch<typeof advancedSchema>,
        query,
        tag,
        search as never,
        filterLocale,
      );
    },
  };
}

/**
 * @deprecated Renamed to `staticClient`, note that the search engine is now ZBSearch.
 */
export const oramaStaticClient = staticClient;
