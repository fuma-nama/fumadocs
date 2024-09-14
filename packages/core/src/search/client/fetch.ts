import type { SortedResult } from '@/server';

export interface FetchOptions {
  /**
   * API route for search endpoint
   */
  api?: string;
}

export async function fetchDocs(
  query: string,
  locale: string | undefined,
  tag: string | undefined,
  options: FetchOptions,
): Promise<SortedResult[] | 'empty'> {
  if (query.length === 0) return 'empty';

  const params = new URLSearchParams();
  params.set('query', query);
  if (locale) params.set('locale', locale);
  if (tag) params.set('tag', tag);

  const res = await fetch(
    `${options.api ?? '/api/search'}?${params.toString()}`,
  );

  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as SortedResult[];
}
