import {
  APIErrorCode,
  isFullBlock,
  isFullPage,
  isNotionClientError,
  type BlockObjectResponse,
  type PageObjectResponse,
} from '@notionhq/client';
import { getNotionFileUrl, isAssetBlock, type NotionAssetBlock } from './blocks';
import type { NotionIntegration } from './source';

const DEFAULT_FILE_PATH = '/api/notion/file';

export interface NotionFileUrlResolverOptions {
  /** ID of the Notion page the rendered blocks belong to. */
  pageId: string;
  /**
   * Route the file handler ({@link createNotionFileHandler}) is mounted at.
   * @default "/api/notion/file"
   */
  path?: string;
}

/**
 * Build a `getFileUrl` resolver for {@link import('./renderer').NotionRenderer}.
 *
 * Notion-hosted file URLs expire after about an hour, so internal assets are routed through the
 * file handler instead of being embedded directly. External URLs are returned untouched.
 */
export function createNotionFileUrlResolver({
  pageId,
  path = DEFAULT_FILE_PATH,
}: NotionFileUrlResolverOptions): (block: NotionAssetBlock) => string | undefined {
  const base = normalizeProxyPath(path);

  return (block) => {
    const direct = getNotionFileUrl(block);
    if (!direct || !isInternalAsset(block)) return direct;

    const query = new URLSearchParams({ page: pageId, block: block.id });
    return `${base}?${query}`;
  };
}

/**
 * Create a request handler that refreshes Notion's expiring signed file URLs.
 *
 * Pair it with {@link createNotionFileUrlResolver}: the resolver points internal assets at this
 * handler, which retrieves a fresh signed URL and `302`-redirects to it, after verifying that the
 * requested block belongs to a page in the integration's data source.
 *
 * The handler reads `?page=<pageId>&block=<blockId>` from the request URL, so it can be mounted in
 * any framework that exposes a `Request`/`Response` route (Next.js route handlers, Hono, etc.).
 *
 * ```ts
 * // app/api/notion/file/route.ts
 * export const GET = createNotionFileHandler(notion);
 * ```
 */
export function createNotionFileHandler(
  integration: NotionIntegration,
): (request: Request) => Promise<Response> {
  return async function handler(request) {
    const { searchParams } = new URL(request.url);
    const pageId = searchParams.get('page');
    const blockId = searchParams.get('block');
    if (!pageId || !blockId || !isNotionId(pageId) || !isNotionId(blockId)) {
      return new Response('Invalid Notion file request', { status: 400 });
    }

    try {
      const response = await integration.client.blocks.retrieve({ block_id: blockId });
      if (!isFullBlock(response) || !isAssetBlock(response)) {
        return new Response('Notion file not found', { status: 404 });
      }

      const parentPageId = await getParentPageId(integration, response);
      if (!parentPageId || !sameNotionId(parentPageId, pageId)) {
        return new Response('Notion file not found', { status: 404 });
      }

      const page = await integration.client.pages.retrieve({ page_id: pageId });
      if (!isIntegrationPage(page, integration.dataSourceId)) {
        return new Response('Notion file not found', { status: 404 });
      }

      const url = getNotionFileUrl(response);
      if (!url || !/^https?:\/\//.test(url)) {
        return new Response('Notion file not found', { status: 404 });
      }

      return new Response(null, {
        status: 302,
        headers: {
          'Cache-Control': 'private, no-store',
          Location: url,
        },
      });
    } catch (error) {
      if (isNotionClientError(error) && error.code === APIErrorCode.ObjectNotFound) {
        return new Response('Notion file not found', { status: 404 });
      }
      throw error;
    }
  };
}

async function getParentPageId(
  integration: NotionIntegration,
  block: BlockObjectResponse,
): Promise<string | undefined> {
  let current = block;
  const visited = new Set<string>();

  for (let depth = 0; depth < 32; depth++) {
    if (current.parent.type === 'page_id') return current.parent.page_id;
    if (current.parent.type !== 'block_id' || visited.has(current.parent.block_id)) return;

    visited.add(current.parent.block_id);
    const parent = await integration.client.blocks.retrieve({ block_id: current.parent.block_id });
    if (!isFullBlock(parent)) return;
    current = parent;
  }
}

function isIntegrationPage(
  page: PageObjectResponse | { object: 'page'; id: string },
  dataSourceId: string,
): page is PageObjectResponse {
  return (
    isFullPage(page) &&
    page.parent.type === 'data_source_id' &&
    sameNotionId(page.parent.data_source_id, dataSourceId)
  );
}

function isInternalAsset(block: NotionAssetBlock): boolean {
  switch (block.type) {
    case 'audio':
      return block.audio.type === 'file';
    case 'embed':
      return isSignedFileUrl(block.embed.url);
    case 'file':
      return block.file.type === 'file';
    case 'image':
      return block.image.type === 'file';
    case 'pdf':
      return block.pdf.type === 'file';
    case 'video':
      return block.video.type === 'file';
    case 'callout':
      return block.callout.icon?.type === 'file';
    case 'paragraph':
      return block.paragraph.icon?.type === 'file';
  }
}

function isSignedFileUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.searchParams.has('X-Amz-Signature') ||
      url.searchParams.has('X-Amz-Algorithm') ||
      url.hostname.endsWith('.notion-static.com')
    );
  } catch {
    return false;
  }
}

function normalizeProxyPath(value = DEFAULT_FILE_PATH): string {
  const path = value.startsWith('/') ? value : `/${value}`;
  if (/[?#]/.test(path)) {
    throw new Error('[@fumadocs/notion] file path cannot include a query or hash');
  }
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

function isNotionId(value: string): boolean {
  return /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.test(
    value,
  );
}

function sameNotionId(a: string, b: string): boolean {
  return a.replaceAll('-', '').toLowerCase() === b.replaceAll('-', '').toLowerCase();
}
