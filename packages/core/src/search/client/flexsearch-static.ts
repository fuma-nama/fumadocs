import { useCallback } from 'react';
import type { SearchClient } from '../client';
import { type UseSearchOptions, useSearch } from '../use-search';
import type { SortedResult } from '@/search';
import type { ExportedData } from '../flexsearch';
import type { Document } from 'flexsearch';
import { createDocument, search, type Doc } from '../flexsearch/utils';
import { BASE_PATH, join } from '@/utils/url';

export interface FlexsearchStaticOptions {
  /**
   * @defaultValue `/api/search`
   */
  from?: string;
  locale?: string;
  tag?: string | string[];
}

function initDocument(data: Record<string, string>) {
  const document = createDocument();
  for (const [k, v] of Object.entries(data)) document.import(k, v);
  return document;
}

const cacheMap = new Map<string, Promise<Map<string, Document<Doc>>>>();

async function searchFlexsearchStatic(
  { from = join(BASE_PATH, '/api/search'), locale = '', tag }: FlexsearchStaticOptions,
  query: string,
): Promise<SortedResult[]> {
  let dbs = cacheMap.get(from);
  if (!dbs) cacheMap.set(from, (dbs = init(from)));
  const db = (await dbs).get(locale);
  if (!db) return [];
  return search(db, query, tag);
}

export function flexsearchStaticClient(options: FlexsearchStaticOptions = {}): SearchClient {
  return {
    deps: [options.from, options.locale, String(options.tag)],
    search: (query) => searchFlexsearchStatic(options, query),
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

export function useFlexsearchStatic(options: FlexsearchStaticOptions & UseSearchOptions = {}) {
  const { from, locale, tag } = options;
  const run = useCallback(
    (query: string) => searchFlexsearchStatic({ from, locale, tag }, query),
    [from, locale, tag],
  );
  return useSearch(run, options);
}
