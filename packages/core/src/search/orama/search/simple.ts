import { type Orama, search, type SearchParams } from '@orama/orama';
import type { SortedResult } from '@/server';
import {
  type SimpleDocument,
  type simpleSchema,
} from '@/search/orama/create-db';
import { createContentHighlighter } from '@/search/shared';

export async function searchSimple(
  db: Orama<typeof simpleSchema>,
  query: string,
  params: Partial<
    SearchParams<Orama<typeof simpleSchema>, SimpleDocument>
  > = {},
): Promise<SortedResult[]> {
  const highlighter = createContentHighlighter(query);
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
    contentWithHighlights: highlighter.highlight(hit.document.title),
    id: hit.document.url,
    url: hit.document.url,
  }));
}
