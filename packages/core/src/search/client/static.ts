import {
  type AnyOrama,
  create,
  load,
  type Orama,
  type RawData,
} from '@orama/orama';
import { type SortedResult } from '@/server';
import { searchSimple } from '@/search/search/simple';
import { searchAdvanced } from '@/search/search/advanced';
import { type advancedSchema } from '@/search/create-db';
import { type schema } from '@/search/create-db-simple';

interface Client {
  search: (
    query: string,
    locale: string | undefined,
    tag: string | undefined,
  ) => Promise<SortedResult[]>;
}

type Type = 'simple' | 'advanced';

type ExportedData =
  | (RawData & { type: Type })
  | {
      type: 'i18n';
      data: Record<string, RawData & { type: Type }>;
    };

// locale -> db
const dbs = new Map<
  string,
  {
    type: 'simple' | 'advanced';
    db: AnyOrama;
  }
>();
let started = false;

export function createStaticClient(from = '/api/search'): Client {
  async function init(): Promise<void> {
    if (started) return;
    started = true;
    const res = await fetch(from);

    if (!res.ok)
      throw new Error(
        `failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`,
      );

    const data = (await res.json()) as ExportedData;

    if (data.type === 'i18n') {
      const loadAll = Object.entries(data.data).map(async ([k, v]) => {
        const db = await create({ schema: { _: 'string' } });

        await load(db, v);
        dbs.set(k, {
          type: v.type,
          db,
        });
      });

      await Promise.all(loadAll);
    } else {
      const db = await create({ schema: { _: 'string' } });

      await load(db, data);
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
      const db = dbs.get(locale ?? '');

      if (!db) return [];
      if (db.type === 'simple')
        return searchSimple(db as unknown as Orama<typeof schema>, query);

      return searchAdvanced(
        db as unknown as Orama<typeof advancedSchema>,
        query,
        tag,
      );
    },
  };
}
