import { getByID, type Orama, search, type SearchParams } from '@orama/orama';
import { type AdvancedDocument, type advancedSchema } from '@/search/create-db';
import { removeUndefined } from '@/utils/remove-undefined';
import type { SortedResult } from '@/server';

export async function searchAdvanced(
  db: Orama<typeof advancedSchema>,
  query: string,
  tag: string | undefined,
  extraParams: Partial<
    SearchParams<Orama<typeof advancedSchema>, AdvancedDocument>
  > = {},
): Promise<SortedResult[]> {
  let params: SearchParams<typeof db, AdvancedDocument> = {
    where: removeUndefined({
      tag,
      ...extraParams.where,
    }),
    groupBy: {
      properties: ['page_id'],
      maxResult: 8,
      ...extraParams.groupBy,
    },
  };

  if (query.length > 0) {
    params = {
      ...params,
      term: query,
      tolerance: 1,
      properties: ['content', 'keywords'],
      ...extraParams,
      where: params.where,
      groupBy: params.groupBy,
    };
  }

  const result = await search(db, params);
  const list: SortedResult[] = [];
  for (const item of result.groups ?? []) {
    const pageId = item.values[0] as string;

    const page = await getByID(db, pageId);
    if (!page) continue;

    list.push({
      id: pageId,
      type: 'page',
      content: page.content,
      url: page.url,
    });

    for (const hit of item.result) {
      if (hit.document.type === 'page') continue;

      list.push({
        id: hit.document.id.toString(),
        content: hit.document.content,
        type: hit.document.type as SortedResult['type'],
        url: hit.document.url,
      });
    }
  }
  return list;
}
