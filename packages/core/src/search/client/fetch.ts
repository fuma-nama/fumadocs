import type { SortedResult } from '@/search';

export interface FetchOptions {
  /**
   * API route for search endpoint, support absolute URLs.
   *
   * @defaultValue '/api/search'
   */
  api?: string;

  /**
   * Filter results with specific tag(s).
   */
  tag?: string | string[];

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
  const url = new URL(api, window.location.origin);
  url.searchParams.set('query', query);
  if (locale) url.searchParams.set('locale', locale);
  if (tag) url.searchParams.set('tag', Array.isArray(tag) ? tag.join(',') : tag);

  const key = url.toString();
  const cached = cache.get(key);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text());
  const result = (await res.json()) as SortedResult[];
  cache.set(key, result);
  return result;
}
