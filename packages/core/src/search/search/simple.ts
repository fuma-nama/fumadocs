import { type Orama, search, type SearchParams } from '@orama/orama';
import type { SortedResult } from '@/server';
import { type schema, type SimpleDocument } from '@/search/create-db-simple';

export async function searchSimple(
  db: Orama<typeof schema>,
  query: string,
  params: Partial<SearchParams<Orama<typeof schema>, SimpleDocument>> = {},
): Promise<SortedResult[]> {
  const result = await search(db, {
    term: query,
    tolerance: 1,
    ...params,
    boost: {
      title: 2,
      ...('boost' in params ? params.boost : undefined),
    },
  });

  return result.hits.map<SortedResult>((hit) => ({
    type: 'page',
    content: hit.document.title,
    id: hit.document.url,
    url: hit.document.url,
  }));
}
