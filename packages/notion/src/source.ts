import {
  isFullBlock,
  isFullPage,
  type BlockObjectResponse,
  type Client,
  type PageObjectResponse,
  type QueryDataSourceParameters,
} from '@notionhq/client';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { DynamicSource, MetaData, PageData, VirtualFile } from 'fumadocs-core/source';
import path from 'node:path';
import { blocksToStructuredData, richTextToPlainText, type NotionBlock } from './blocks';
import { cache } from 'react';

export {
  blocksToPlainText,
  blocksToStructuredData,
  blocksToTableOfContents,
  getBlockText,
  getHeadingDepth,
  richTextToPlainText,
  type NotionBlock,
} from './blocks';

export interface NotionPageLoaded {
  page: PageObjectResponse;
  blocks: NotionBlock[];
}

export interface NotionPageData extends PageData {
  id: string;
  notion: PageObjectResponse;
  title: string;
  description?: string;
  load: () => Promise<NotionPageLoaded>;
  structuredData: () => Promise<StructuredData>;
}

export interface NotionPropertyMap {
  /** Name of the title property. By default, the first title property is used. */
  title?: string;
  /** Name of the URL path property. Defaults to a property named `Slug`. */
  slug?: string;
  /** Name of the page description property. Defaults to a property named `Description`. */
  description?: string;
}

export interface NotionPageInfo {
  title: string;
  description?: string;
  slugs: string[];
}

export type NotionQuery = Omit<
  QueryDataSourceParameters,
  'data_source_id' | 'result_type' | 'start_cursor'
>;

export interface NotionSourceOptions {
  /** Base directory for generated virtual file paths. */
  baseDir?: string;
  /** Map Notion properties to Fumapress page fields. */
  properties?: NotionPropertyMap;
  /** Filter, sort, or otherwise customize the data source query. */
  query?: NotionQuery;
  /** Generate a virtual file path. The default uses the slug property and appends `.mdx`. */
  generatePath?: (page: PageObjectResponse, info: NotionPageInfo) => string | Promise<string>;
}

export interface CreateNotionOptions {
  client: Client;
  /** ID of the Notion data source that contains the pages to publish. */
  dataSourceId: string;
  /** Maximum number of nested block collections fetched concurrently. @default 4 */
  blockConcurrency?: number;
}

export interface NotionIntegration {
  $inferPage: NotionPageData;
  client: Client;
  dataSourceId: string;
  dynamicSource: (
    options?: NotionSourceOptions,
  ) => DynamicSource<{ pageData: NotionPageData; metaData: MetaData }>;
  getBlocks: (pageId: string) => Promise<NotionBlock[]>;
}

export function createNotion({
  client,
  dataSourceId,
  blockConcurrency = 4,
}: CreateNotionOptions): NotionIntegration {
  if (blockConcurrency < 1 || !Number.isInteger(blockConcurrency)) {
    throw new TypeError('[@fumadocs/notion] blockConcurrency must be a positive integer');
  }

  const limitBlockRequest = createLimiter(blockConcurrency);

  async function getBlocks(pageId: string) {
    return retrieveBlockChildren(client, pageId, limitBlockRequest);
  }

  return {
    $inferPage: undefined as never,
    client,
    dataSourceId,
    getBlocks,
    dynamicSource(options = {}) {
      async function toVirtualFile(
        page: PageObjectResponse,
        seenPaths: Map<string, string>,
      ): Promise<VirtualFile<{ pageData: NotionPageData; metaData: MetaData }>> {
        const info = getPageInfo(page, options.properties);
        const generatedPath = options.generatePath
          ? await options.generatePath(page, info)
          : info.slugs.length === 0
            ? 'index.mdx'
            : `${info.slugs.join('/')}.mdx`;
        const filePath = resolveVirtualPath(options.baseDir, generatedPath);
        const duplicate = seenPaths.get(filePath);
        if (duplicate) {
          throw new Error(
            `[@fumadocs/notion] Pages "${duplicate}" and "${page.id}" resolve to the same virtual path: ${filePath}`,
          );
        }
        seenPaths.set(filePath, page.id);

        const load = cache(async () => {
          return { blocks: await getBlocks(page.id), page };
        });

        return {
          type: 'page',
          path: filePath,
          slugs: info.slugs,
          data: {
            id: page.id,
            notion: page,
            title: info.title,
            description: info.description,
            icon: getPageIcon(page),
            load,
            async structuredData() {
              return blocksToStructuredData((await load()).blocks);
            },
          },
        };
      }

      return {
        async files() {
          const pages: PageObjectResponse[] = [];
          let cursor: string | null | undefined;
          do {
            const response = await client.dataSources.query({
              page_size: 100,
              ...options.query,
              data_source_id: dataSourceId,
              result_type: 'page',
              start_cursor: cursor,
            });
            for (const result of response.results) {
              if (isFullPage(result) && !result.in_trash) pages.push(result);
            }
            if (response.request_status?.type === 'incomplete') {
              throw new Error(
                "[@fumadocs/notion] The data source query reached Notion's result limit. Narrow the query filter so every page can be loaded.",
              );
            }
            cursor = response.has_more ? response.next_cursor : undefined;
          } while (cursor);

          const seenPaths = new Map<string, string>();
          return Promise.all(pages.map((page) => toVirtualFile(page, seenPaths)));
        },
      };
    },
  };
}

export function isNotionPageData(value: PageData): value is NotionPageData {
  const candidate = value as Partial<NotionPageData>;
  return (
    candidate.notion?.object === 'page' &&
    typeof candidate.id === 'string' &&
    typeof candidate.load === 'function'
  );
}

async function retrieveBlockChildren(
  client: Client,
  blockId: string,
  limitRequest: <T>(task: () => Promise<T>) => Promise<T>,
): Promise<NotionBlock[]> {
  const blocks: BlockObjectResponse[] = [];
  let cursor: string | null | undefined;
  do {
    const response = await limitRequest(() =>
      client.blocks.children.list({
        block_id: blockId,
        page_size: 100,
        start_cursor: cursor,
      }),
    );
    for (const result of response.results) {
      if (isFullBlock(result) && !result.in_trash) blocks.push(result);
    }
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return Promise.all(blocks.map((block) => hydrateBlock(client, block, limitRequest)));
}

async function hydrateBlock(
  client: Client,
  block: BlockObjectResponse,
  limitRequest: <T>(task: () => Promise<T>) => Promise<T>,
): Promise<NotionBlock> {
  const referencedChildren = getReferencedChildren(block);
  if (referencedChildren.length > 0) {
    const children = await Promise.all(
      referencedChildren.map(async (blockId) => {
        const result = await limitRequest(() => client.blocks.retrieve({ block_id: blockId }));
        if (!isFullBlock(result) || result.in_trash) return;
        return hydrateBlock(client, result, limitRequest);
      }),
    );

    return {
      ...block,
      children: children.filter((child): child is NotionBlock => child !== undefined),
    };
  }

  if (!block.has_children) return block;
  return {
    ...block,
    children: await retrieveBlockChildren(client, block.id, limitRequest),
  };
}

function getReferencedChildren(block: BlockObjectResponse): string[] {
  const children =
    block.type === 'meeting_notes'
      ? block.meeting_notes.children
      : block.type === 'transcription'
        ? block.transcription.children
        : undefined;

  if (!children) return [];
  return [children.summary_block_id, children.notes_block_id, children.transcript_block_id].filter(
    (blockId): blockId is string => blockId !== undefined,
  );
}

function createLimiter(limit: number): <T>(task: () => Promise<T>) => Promise<T> {
  let active = 0;
  const queue: Array<() => void> = [];

  return async function run<T>(task: () => Promise<T>): Promise<T> {
    if (active >= limit) await new Promise<void>((resolve) => queue.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      queue.shift()?.();
    }
  };
}

function getPageInfo(page: PageObjectResponse, map: NotionPropertyMap = {}): NotionPageInfo {
  const titleProperty = map.title
    ? page.properties[map.title]
    : Object.values(page.properties).find((property) => property.type === 'title');
  const title = getPropertyText(titleProperty) || page.id;
  const slugProperty = page.properties[map.slug ?? findPropertyName(page, 'Slug') ?? ''];
  const slug = getPropertyText(slugProperty) || slugify(title) || page.id;
  const descriptionProperty =
    page.properties[map.description ?? findPropertyName(page, 'Description') ?? ''];

  return {
    title,
    description: getPropertyText(descriptionProperty) || undefined,
    slugs: parseSlug(slug, page.id),
  };
}

function getPropertyText(
  property: PageObjectResponse['properties'][string] | undefined,
): string | undefined {
  if (!property) return;
  switch (property.type) {
    case 'title':
      return richTextToPlainText(property.title);
    case 'rich_text':
      return richTextToPlainText(property.rich_text);
    case 'url':
      return property.url ?? undefined;
    case 'email':
      return property.email ?? undefined;
    case 'phone_number':
      return property.phone_number ?? undefined;
    case 'select':
      return property.select?.name;
    case 'status':
      return property.status?.name;
    case 'multi_select':
      return property.multi_select.map((item) => item.name).join(', ');
    case 'number':
      return property.number === null ? undefined : String(property.number);
    case 'checkbox':
      return String(property.checkbox);
    case 'date':
      return property.date?.start;
    case 'created_time':
      return property.created_time;
    case 'last_edited_time':
      return property.last_edited_time;
    case 'formula':
      switch (property.formula.type) {
        case 'string':
          return property.formula.string ?? undefined;
        case 'number':
          return property.formula.number === null ? undefined : String(property.formula.number);
        case 'boolean':
          return String(property.formula.boolean);
        case 'date':
          return property.formula.date?.start;
      }
  }
}

function findPropertyName(page: PageObjectResponse, name: string): string | undefined {
  const normalized = name.toLowerCase();
  return Object.keys(page.properties).find((key) => key.toLowerCase() === normalized);
}

function parseSlug(value: string, pageId: string): string[] {
  const slugs = value
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean);
  if (slugs.some((part) => part === '.' || part === '..')) {
    throw new Error(`[@fumadocs/notion] Page "${pageId}" has an unsafe slug: ${value}`);
  }
  return slugs;
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^\p{L}\p{N}]+/gu, '-')
    .replaceAll(/^-|-$/g, '');
}

function resolveVirtualPath(baseDir: string | undefined, generatedPath: string): string {
  const normalized = generatedPath.replaceAll('\\', '/').replace(/^\/+/, '');
  if (!normalized || normalized.split('/').some((part) => part === '..')) {
    throw new Error(`[@fumadocs/notion] Invalid virtual path: ${generatedPath}`);
  }

  return baseDir ? path.posix.join(baseDir.replaceAll('\\', '/'), normalized) : normalized;
}

function getPageIcon(page: PageObjectResponse): string | undefined {
  if (page.icon?.type === 'emoji') return page.icon.emoji;
  return undefined;
}
