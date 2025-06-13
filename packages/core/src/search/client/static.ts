import { type AnyOrama, create, load, type Orama } from '@orama/orama';
import { searchSimple } from '@/search/orama/search/simple';
import { searchAdvanced } from '@/search/orama/search/advanced';
import {
  type advancedSchema,
  type simpleSchema,
} from '@/search/orama/create-db';
import type { ExportedData } from '@/search/server';

export interface StaticOptions {
  /**
   * Where to download exported search indexes (URL)
   *
   * @defaultValue '/api/search'
   */
  from?: string;

  initOrama?: (locale?: string) => AnyOrama | Promise<AnyOrama>;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  /**
   * Filter by locale (unsupported at the moment)
   */
  locale?: string;
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
}: StaticOptions): Promise<Database> {
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

export async function search(query: string, options: StaticOptions) {
  const { tag, locale } = options;

  const db = (await loadDB(options)).get(locale ?? '');

  if (!db) return [];
  if (db.type === 'simple')
    return searchSimple(db as unknown as Orama<typeof simpleSchema>, query);

  return searchAdvanced(db.db as Orama<typeof advancedSchema>, query, tag);
}
