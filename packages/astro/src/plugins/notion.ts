import {
  blocksToPlainText,
  blocksToTableOfContents,
  createNotionFileHandler,
  createNotionFileUrlResolver,
  isNotionPageData,
  NotionRenderer,
  type NotionFileUrlResolverOptions,
  type NotionIntegration,
  type NotionPageData,
  type NotionRendererProps,
} from '@fumadocs/notion';
import { createElement } from 'react';
import type { AnyPage, Plugin } from '../app';
import { loadOnce } from '../shared';

export interface NotionPluginOptions extends Pick<
  NotionRendererProps,
  'components' | 'highlightCode'
> {
  /**
   * Serve Notion-hosted files through a route on request, as their URLs expire after an hour. It requires an adapter, set it to `false` for static sites with durable file URLs.
   *
   * @defaultValue true
   */
  fileProxy?: boolean | Pick<NotionFileUrlResolverOptions, 'path'>;
}

const sameId = (a: string, b: string) => a.replaceAll('-', '') === b.replaceAll('-', '');

/**
 * Render the pages of a Notion data source from `@fumadocs/notion`, with their last edited dates.
 */
export function notionPlugin(
  notion: NotionIntegration,
  { fileProxy = true, ...options }: NotionPluginOptions = {},
): Plugin {
  const filePath = (typeof fileProxy === 'object' && fileProxy.path) || '/api/notion/file';

  function getData(page: AnyPage): NotionPageData | undefined {
    const { parent } = isNotionPageData(page.data) ? page.data.notion : {};
    if (parent?.type === 'data_source_id' && sameId(parent.data_source_id, notion.dataSourceId))
      return page.data as NotionPageData;
  }

  return {
    name: 'notion',
    routes() {
      if (!fileProxy) return [];
      if (!this.server)
        throw new Error(
          '`notionPlugin()` serves Notion files on request, add an adapter to Astro, or set `fileProxy: false`.',
        );
      const handler = createNotionFileHandler(notion);
      return [
        {
          type: 'file',
          url: this.base + filePath,
          prerender: false,
          GET: ({ request }) => handler(request),
        },
      ];
    },
    async getBody(page) {
      const data = getData(page);
      if (!data) return;
      const { blocks } = await loadOnce(data);
      return {
        node: createElement(NotionRenderer, {
          ...options,
          blocks,
          getFileUrl: fileProxy
            ? createNotionFileUrlResolver({ pageId: data.id, path: this.base + filePath })
            : undefined,
        }),
        toc: blocksToTableOfContents(blocks),
      };
    },
    async getText(page) {
      const data = getData(page);
      if (data) return blocksToPlainText((await loadOnce(data)).blocks);
    },
    transformPage(page, data) {
      const notionData = getData(page);
      if (!notionData) return data;
      return { ...data, lastModified: new Date(notionData.notion.last_edited_time) };
    },
  };
}
