import { search, type SearchParams, type ZBSearch } from 'zbsearch';
import { type SimpleDocument, type simpleSchema } from '@/search/zbsearch/create-db';
import { removeUndefined } from '@/utils/remove-undefined';
import { createContentHighlighter, type SortedResult } from '@/search';

export async function searchSimple(
  db: ZBSearch<typeof simpleSchema>,
  query: string,
  params: Partial<SearchParams<ZBSearch<typeof simpleSchema>, SimpleDocument>> = {},
  locale?: string,
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
    where: removeUndefined({
      locale: locale ? { eq: locale } : undefined,
      ...params.where,
    }),
  });

  return result.hits.map<SortedResult>((hit) => ({
    type: 'page',
    content: highlighter.highlightMarkdown(hit.document.title),
    breadcrumbs: hit.document.breadcrumbs,
    id: hit.document.url,
    url: hit.document.url,
  }));
}
