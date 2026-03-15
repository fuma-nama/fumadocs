import { type AnyOrama, create, load, type Orama, type SearchParams } from '@orama/orama';
import { searchSimple } from '@/search/orama/search/simple';
import { searchAdvanced } from '@/search/orama/search/advanced';
import type { advancedSchema, simpleSchema } from '@/search/orama/create-db';
import type { ExportedData } from '@/search/server';
import type { SearchClient } from '../client';

export interface StaticOptions {
  /**
   * Where to download exported search indexes (URL)
   *
   * @defaultValue '/api/search'
   */
  from?: string;

  initOrama?: (locale?: string) => AnyOrama | Promise<AnyOrama>;

  /**
   * Filter results with specific tag(s).
   */
  tag?: string | string[];

  /**
   * Filter by locale (unsupported at the moment)
   */
  locale?: string;

  /**
   * extra options for search
   */
  search?: Partial<SearchParams<Orama<unknown>>>;
}

const cache = new Map<string, Promise<Database>>();

// locale -> db
type Database = Map<
  string,
  {
    type: 'simple' | 'advanced';
    db: AnyOrama;
  }
>;

async function loadDB({
  from = '/api/search',
  initOrama = (locale) => create({ schema: { _: 'string' }, language: locale }),
}: StaticOptions = {}): Promise<Database> {
  const cacheKey = from;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  async function init() {
    const res = await fetch(from);

    if (!res.ok)
      throw new Error(
        `failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`,
      );

    const data = (await res.json()) as ExportedData;
    const dbs: Database = new Map();

    if (data.type === 'i18n') {
      await Promise.all(
        Object.entries(data.data).map(async ([k, v]) => {
          const db = await initOrama(k);

          load(db, v);
          dbs.set(k, {
            type: v.type,
            db,
          });
        }),
      );

      return dbs;
    }

    const db = await initOrama();
    load(db, data);
    dbs.set('', {
      type: data.type,
      db,
    });
    return dbs;
  }

  const result = init();
  cache.set(cacheKey, result);
  return result;
}

export function oramaStaticClient(options: StaticOptions): SearchClient {
  const { tag, locale, search } = options;

  return {
    deps: [tag, locale],
    async search(query) {
      const db = (await loadDB(options)).get(locale ?? '');

      if (!db) return [];
      if (db.type === 'simple')
        return searchSimple(db as unknown as Orama<typeof simpleSchema>, query, search as never);

      return searchAdvanced(db.db as Orama<typeof advancedSchema>, query, tag, search as never);
    },
  };
}
