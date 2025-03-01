import { type AnyOrama, create, load, type Orama } from '@orama/orama';
import { type SortedResult } from '@/server';
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
   */
  from?: string;

  initOrama?: (locale?: string) => AnyOrama | Promise<AnyOrama>;
}

export interface StaticClient {
  search: (
    query: string,
    locale: string | undefined,
    tag: string | undefined,
  ) => Promise<SortedResult[]>;
}

export function createStaticClient({
  from = '/api/search',
  initOrama = (locale) => create({ schema: { _: 'string' }, language: locale }),
}: StaticOptions): StaticClient {
  // locale -> db
  const dbs = new Map<
    string,
    {
      type: 'simple' | 'advanced';
      db: AnyOrama;
    }
  >();

  async function init(): Promise<void> {
    const res = await fetch(from);

    if (!res.ok)
      throw new Error(
        `failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`,
      );

    const data = (await res.json()) as ExportedData;

    if (data.type === 'i18n') {
      for (const [k, v] of Object.entries(data.data)) {
        const db = await initOrama(k);

        load(db, v);
        dbs.set(k, {
          type: v.type,
          db,
        });
      }
    } else {
      const db = await initOrama();

      load(db, data);
      dbs.set('', {
        type: data.type,
        db,
      });
    }
  }

  const get = init();
  return {
    async search(query, locale, tag) {
      await get;
      const cached = dbs.get(locale ?? '');

      if (!cached) return [];
      if (cached.type === 'simple')
        return searchSimple(
          cached as unknown as Orama<typeof simpleSchema>,
          query,
        );

      return searchAdvanced(
        cached.db as Orama<typeof advancedSchema>,
        query,
        tag,
      );
    },
  };
}
