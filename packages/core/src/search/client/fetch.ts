import type { SortedResult } from '@/server';

export async function fetchDocs(
  api: string,
  query: string,
  locale: string | undefined,
  tag: string | undefined,
): Promise<SortedResult[] | 'empty'> {
  if (query.length === 0) return 'empty';

  const params = new URLSearchParams();
  params.set('query', query);
  if (locale) params.set('locale', locale);
  if (tag) params.set('tag', tag);

  const res = await fetch(`${api}?${params.toString()}`);

  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as SortedResult[];
}
