import { getByID, type Orama, search, type SearchParams } from '@orama/orama';
import {
  type AdvancedDocument,
  type advancedSchema,
} from '@/search/orama/create-db';
import { removeUndefined } from '@/utils/remove-undefined';
import type { SortedResult } from '@/server';

export async function searchAdvanced(
  db: Orama<typeof advancedSchema>,
  query: string,
  tag: string | string[] = [],
  extraParams: Partial<
    SearchParams<Orama<typeof advancedSchema>, AdvancedDocument>
  > = {},
): Promise<SortedResult[]> {
  if (typeof tag === 'string') tag = [tag];

  let params = {
    ...extraParams,
    where: removeUndefined({
      tags: {
        containsAll: tag,
      },
      ...extraParams.where,
    }),
    groupBy: {
      properties: ['page_id'],
      maxResult: 8,
      ...extraParams.groupBy,
    },
  } as SearchParams<typeof db, AdvancedDocument>;

  if (query.length > 0) {
    params = {
      ...params,
      term: query,
      properties: ['content'],
    } as SearchParams<typeof db, AdvancedDocument>;
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
