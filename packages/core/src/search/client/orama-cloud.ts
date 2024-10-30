import type { SortedResult } from '@/server';
import type { OramaClient, ClientSearchParams } from '@oramacloud/client';
import { removeUndefined } from '@/utils/remove-undefined';
import type { OramaIndex } from '@/search/orama-cloud';

export interface OramaCloudOptions {
  client: OramaClient;
  params?: ClientSearchParams;
}

export async function searchDocs(
  query: string,
  tag: string | undefined,
  options: OramaCloudOptions,
): Promise<SortedResult[]> {
  const { client, params: extraParams = {} } = options;

  const params: ClientSearchParams = {
    ...extraParams,
    term: query,
    where: removeUndefined({
      tag,
      ...extraParams.where,
    }),
    groupBy: {
      properties: ['page_id'],
      maxResult: 7,
      ...extraParams.groupBy,
    },
  };

  const result = await client.search(params);
  if (!result) return [];

  const list: SortedResult[] = [];
  for (const item of result.groups ?? []) {
    let addedHead = false;

    for (const hit of item.result) {
      const doc = hit.document as OramaIndex;

      if (!addedHead) {
        list.push({
          id: doc.page_id,
          type: 'page',
          content: doc.title,
          url: doc.url,
        });
        addedHead = true;
      }

      list.push({
        id: doc.id,
        content: doc.content,
        type: doc.content === doc.section ? 'heading' : 'text',
        url: doc.url,
      });
    }
  }

  return list;
}
