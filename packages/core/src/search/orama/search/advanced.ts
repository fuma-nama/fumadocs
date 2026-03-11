import { getByID, type Orama, search, type SearchParams } from '@orama/orama';
import { type AdvancedDocument, type advancedSchema } from '@/search/orama/create-db';
import { removeUndefined } from '@/utils/remove-undefined';
import { createContentHighlighter, type SortedResult } from '@/search';

export async function searchAdvanced(
  db: Orama<typeof advancedSchema>,
  query: string,
  tag: string | string[] = [],
  {
    mode = 'fulltext',
    ...override
  }: Partial<SearchParams<Orama<typeof advancedSchema>, AdvancedDocument>> = {},
): Promise<SortedResult[]> {
  if (typeof tag === 'string') tag = [tag];

  const params = {
    limit: 60,
    mode,
    ...override,
    where: removeUndefined({
      tags:
        tag.length > 0
          ? {
              containsAll: tag,
            }
          : undefined,
      ...override.where,
    }),
    groupBy: {
      properties: ['page_id'],
      maxResult: 8,
      ...override.groupBy,
    },
    properties: mode === 'fulltext' ? ['content'] : ['content', 'embeddings'],
  } as SearchParams<typeof db, AdvancedDocument>;

  if (query.length > 0) {
    params.term = query;
  }

  const highlighter = createContentHighlighter(query);
  const result = await search(db, params);
  const list: SortedResult[] = [];
  for (const item of result.groups ?? []) {
    const pageId = item.values[0] as string;

    const page = getByID(db, pageId);
    if (!page) continue;

    list.push({
      id: pageId,
      type: 'page',
      content: highlighter.highlightMarkdown(page.content),
      breadcrumbs: page.breadcrumbs,
      url: page.url,
    });

    for (const hit of item.result) {
      if (hit.document.type === 'page') continue;

      list.push({
        id: hit.document.id.toString(),
        content: highlighter.highlightMarkdown(hit.document.content),
        breadcrumbs: hit.document.breadcrumbs,
        type: hit.document.type as SortedResult['type'],
        url: hit.document.url,
      });
    }
  }

  if (typeof params.limit === 'number' && list.length > params.limit) {
    return list.slice(0, params.limit);
  }

  return list;
}
