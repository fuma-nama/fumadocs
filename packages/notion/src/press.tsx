import type { Plugin } from 'fumadocs-core/framework/plugin';
import type { PageData } from 'fumadocs-core/source';
import {
  blocksToPlainText,
  blocksToStructuredData,
  blocksToTableOfContents,
  toNotionId,
} from './blocks';
import {
  createNotionFileHandler,
  createNotionFileUrlResolver,
  type NotionFileUrlResolverOptions,
} from './file';
import { NotionRenderer, type NotionRendererProps } from './renderer';
import {
  isNotionPageData,
  type NotionIntegration,
  type NotionPageData,
  type NotionPageLoaded,
} from './source';

export interface NotionPluginOptions extends Pick<
  NotionRendererProps,
  'components' | 'highlightCode'
> {
  /** the Notion data source from `createNotion()`, the one your content source reads */
  notion: NotionIntegration;

  /**
   * Serve Notion-hosted files through a route on request, as their URLs expire after an hour. It needs a server, set it to `false` for static sites with durable file URLs.
   *
   * @defaultValue true
   */
  fileProxy?: boolean | Pick<NotionFileUrlResolverOptions, 'path'>;
}

/**
 * Render the pages of a Notion data source from `createNotion()`, with their table of contents, search index and dates.
 */
export default function notionPlugin({
  notion,
  fileProxy = true,
  ...options
}: NotionPluginOptions): Plugin {
  const filePath = (typeof fileProxy === 'object' && fileProxy.path) || '/api/notion/file';
  const handler = fileProxy && createNotionFileHandler(notion);
  const dataSourceId = toNotionId(notion.dataSourceId);
  const loaded = new WeakMap<NotionPageData, Promise<NotionPageLoaded>>();

  /** pages of this data source */
  function isNotionPage(data: PageData): data is NotionPageData {
    if (!isNotionPageData(data)) return false;
    const { parent } = data.notion;
    return parent.type === 'data_source_id' && toNotionId(parent.data_source_id) === dataSourceId;
  }

  // the hooks of a page share one fetch of its blocks, revalidating the loader creates new pages
  function load(data: NotionPageData): Promise<NotionPageLoaded> {
    let result = loaded.get(data);
    if (!result) {
      result = data.load();
      // failed requests, like rate limits, are retried on the next render
      result.catch(() => loaded.delete(data));
      loaded.set(data, result);
    }
    return result;
  }

  return {
    name: 'notion',
    routes({ createApi }) {
      if (!handler) return;
      createApi({
        path: filePath,
        GET: async (request) => {
          // files of pages outside the source cost Notion API calls, they are rejected before
          const id = toNotionId(new URL(request.url).searchParams.get('page') ?? '');
          for (const { data } of (await this.getLoader()).getPages()) {
            if (isNotionPage(data) && toNotionId(data.id) === id) return handler(request);
          }
          return new Response('Notion file not found', { status: 404 });
        },
      });
    },
    async getPageBody({ data }) {
      if (!isNotionPage(data)) return;
      const { blocks } = await load(data);
      return {
        node: (
          <NotionRenderer
            {...options}
            blocks={blocks}
            getFileUrl={
              handler
                ? createNotionFileUrlResolver({ pageId: data.id, path: this.withBase(filePath) })
                : undefined
            }
          />
        ),
      };
    },
    async getPageText({ data }) {
      if (isNotionPage(data)) return blocksToPlainText((await load(data)).blocks);
    },
    async getPageToc({ data }) {
      if (isNotionPage(data)) return blocksToTableOfContents((await load(data)).blocks);
    },
    async getPageStructuredData({ data }) {
      if (isNotionPage(data)) return blocksToStructuredData((await load(data)).blocks);
    },
    getPageCreatedAt({ data }) {
      if (isNotionPage(data)) return new Date(data.notion.created_time);
    },
    getPageLastModified({ data }) {
      if (isNotionPage(data)) return new Date(data.notion.last_edited_time);
    },
  };
}
