import type { SortedResult } from '@/server';
import type { ClientSearchParams, OramaClient } from '@oramacloud/client';
import { removeUndefined } from '@/utils/remove-undefined';
import type { OramaIndex } from '@/search/orama-cloud';
import { createContentHighlighter } from '@/search/shared';

interface CrawlerIndex {
  path: string;
  title: string;
  content: string;
  section: string;
  category: string;
}

export interface OramaCloudOptions {
  client: OramaClient;
  /**
   * The type of your index.
   *
   * You can set it to `crawler` if you use crawler instead of the JSON index with schema provided by Fumadocs
   */
  index?: 'default' | 'crawler';
  params?: ClientSearchParams;

  /**
   * Filter results with specific tag.
   */
  tag?: string;

  /**
   * Filter by locale (unsupported at the moment)
   */
  locale?: string;
}

export async function searchDocs(
  query: string,
  options: OramaCloudOptions,
): Promise<SortedResult[]> {
  const highlighter = createContentHighlighter(query);
  const list: SortedResult[] = [];
  const { index = 'default', client, params: extraParams = {}, tag } = options;

  if (index === 'crawler') {
    const result = await client.search({
      ...extraParams,
      term: query,
      where: {
        category: tag
          ? {
              eq: tag.slice(0, 1).toUpperCase() + tag.slice(1),
            }
          : undefined,
        ...extraParams.where,
      },
      limit: 10,
    });
    if (!result) return list;

    for (const hit of result.hits) {
      const doc = hit.document as unknown as CrawlerIndex;

      list.push(
        {
          id: hit.id,
          type: 'page',
          content: doc.title,
          contentWithHighlights: highlighter.highlight(doc.title),
          url: doc.path,
        },
        {
          id: 'page' + hit.id,
          type: 'text',
          content: doc.content,
          contentWithHighlights: highlighter.highlight(doc.content),
          url: doc.path,
        },
      );
    }

    return list;
  }

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
  if (!result || !result.groups) return list;

  for (const item of result.groups) {
    let addedHead = false;

    for (const hit of item.result) {
      const doc = hit.document as unknown as OramaIndex;

      if (!addedHead) {
        list.push({
          id: doc.page_id,
          type: 'page',
          content: doc.title,
          contentWithHighlights: highlighter.highlight(doc.title),
          url: doc.url,
        });
        addedHead = true;
      }

      list.push({
        id: doc.id,
        content: doc.content,
        contentWithHighlights: highlighter.highlight(doc.content),
        type: doc.content === doc.section ? 'heading' : 'text',
        url: doc.section_id ? `${doc.url}#${doc.section_id}` : doc.url,
      });
    }
  }

  return list;
}
