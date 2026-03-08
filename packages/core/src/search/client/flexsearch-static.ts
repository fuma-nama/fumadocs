import type { SearchClient } from '../client';
import type { ExportedData } from '../flexsearch';
import type { Document } from 'flexsearch';
import { createDocument, search, type Doc } from '../flexsearch/utils';

export interface FlexsearchStaticOptions {
  /**
   * @defaultValue `/api/search`
   */
  from?: string;
  locale?: string;
}

function initDocument(data: Record<string, string>) {
  const document = createDocument();
  for (const [k, v] of Object.entries(data)) document.import(k, v);
  return document;
}

const cacheMap = new Map<string, Promise<Map<string, Document<Doc>>>>();

export function flexsearchStaticClient(options: FlexsearchStaticOptions): SearchClient {
  const { from = '/api/search', locale = '' } = options;

  let dbs = cacheMap.get(from);
  if (!dbs) {
    dbs = init(from);
    cacheMap.set(from, dbs);
  }

  return {
    deps: [from, locale],
    async search(query) {
      const loaded = await dbs;
      const db = loaded.get(locale);
      if (!db) return [];
      return search(db, query);
    },
  };
}

async function init(from: string) {
  const res = await fetch(from);

  if (!res.ok)
    throw new Error(
      `failed to fetch exported search indexes from ${from}, make sure the search database is exported and available for client.`,
    );

  const data = (await res.json()) as ExportedData;
  const dbs = new Map<string, Document<Doc>>();

  if (data.type === 'i18n') {
    for (const [locale, map] of Object.entries(data.raw)) {
      dbs.set(locale, initDocument(map));
    }

    return dbs;
  } else {
    dbs.set('', initDocument(data.raw));
  }

  return dbs;
}
