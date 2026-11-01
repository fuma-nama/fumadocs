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
import type { PageData } from 'fumadocs-core/source';
import { createElement } from 'react';
import type { Plugin } from '../app';
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

/**
 * Render the pages of a Notion data source from `@fumadocs/notion`, with their last edited dates.
 */
export function notionPlugin(
  notion: NotionIntegration,
  { fileProxy = true, ...options }: NotionPluginOptions = {},
): Plugin {
  const filePath = (typeof fileProxy === 'object' && fileProxy.path) || '/api/notion/file';
  const dataSourceId = toId(notion.dataSourceId);

  /** pages of this data source */
  function isNotionPage(data: PageData): data is NotionPageData {
    if (!isNotionPageData(data)) return false;
    const { parent } = data.notion;
    return parent.type === 'data_source_id' && toId(parent.data_source_id) === dataSourceId;
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
          GET: ({ request, url }) => {
            // files of other pages cost Notion API calls, they are rejected before
            const id = toId(url.searchParams.get('page') ?? '');
            for (const { data } of this.getPages()) {
              if (isNotionPage(data) && toId(data.id) === id) return handler(request);
            }
            return new Response('Notion file not found', { status: 404 });
          },
        },
      ];
    },
    async getBody({ data }) {
      if (!isNotionPage(data)) return;
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
    async getText({ data }) {
      if (isNotionPage(data)) return blocksToPlainText((await loadOnce(data)).blocks);
    },
    transformPage(page, data) {
      if (!isNotionPage(page.data)) return data;
      return { ...data, lastModified: new Date(page.data.notion.last_edited_time) };
    },
  };
}

/** IDs of Notion are UUIDs, in any case and with or without dashes */
function toId(value: string): string {
  return value.replaceAll('-', '').toLowerCase();
}
