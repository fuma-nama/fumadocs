import type { SortedResult } from '@/server';

export interface FetchOptions {
  /**
   * API route for search endpoint
   *
   * @defaultValue '/api/search'
   */
  api?: string;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  /**
   * Filter by locale
   */
  locale?: string;
}

const cache = new Map<string, SortedResult[]>();

export async function fetchDocs(
  query: string,
  { api = '/api/search', locale, tag }: FetchOptions,
): Promise<SortedResult[]> {
  const params = new URLSearchParams();
  params.set('query', query);
  if (locale) params.set('locale', locale);
  if (tag) params.set('tag', tag);

  const key = `${api}?${params}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(key);

  if (!res.ok) throw new Error(await res.text());
  const result = (await res.json()) as SortedResult[];
  cache.set(key, result);
  return result;
}
