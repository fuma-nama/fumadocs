import type { EnqueuedTaskPromise, Meilisearch } from 'meilisearch';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { LoaderConfig, LoaderOutput } from '@/source/loader';
import type { Awaitable } from '@/types';
import { buildBreadcrumbs, buildDocuments } from './server/build-index';

export interface DocumentRecord {
  title: string;
  description?: string;
  breadcrumbs?: string[];

  /**
   * URL to the page
   */
  url: string;
  structured: StructuredData;

  /**
   * Tag(s) to filter results
   */
  tag?: string | string[];
  locale?: string;
}

/**
 * Document in Meilisearch, for the title, headings and paragraphs of a page
 */
export interface MeilisearchDocument extends Omit<DocumentRecord, 'description' | 'structured'> {
  id: number;
  type: 'page' | 'heading' | 'text';

  /**
   * ID of the heading it belongs to
   */
  heading?: string;
  content: string;
  table?: string;
}

/**
 * Build the search documents of every page in a source.
 */
export async function toDocuments<C extends LoaderConfig>(
  source: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  options: {
    /** Tag to filter results by. */
    tag?: (page: C['page']) => string | string[];
  } = {},
): Promise<DocumentRecord[]> {
  const loader = typeof source === 'function' ? await source() : source;

  return buildDocuments(loader, (index, page) => ({
    title: index.title,
    description: index.description,
    breadcrumbs: buildBreadcrumbs(loader, page),
    url: index.url,
    structured: index.structuredData,
    tag: options.tag?.(page),
    locale: page.locale,
  }));
}

export interface SyncOptions {
  indexName: string;
  documents: DocumentRecord[];
}

/**
 * Configure the index and replace its documents, existing documents stay searchable until the new ones are indexed.
 *
 * @param client - Meilisearch client with an admin API key
 */
export async function sync(client: Meilisearch, options: SyncOptions): Promise<void> {
  const index = client.index<MeilisearchDocument>(options.indexName);
  const documents: MeilisearchDocument[] = [];

  for (const { description, structured, ...page } of options.documents) {
    const add = (type: MeilisearchDocument['type'], content: string, heading?: string) =>
      documents.push({ ...page, id: documents.length, type, content, heading });

    add('page', page.title);
    if (description && !structured.contents.some((item) => item.content === description))
      add('text', description);
    for (const heading of structured.headings) add('heading', heading.content, heading.id);
    for (const item of structured.contents)
      documents.push({ ...page, id: documents.length, type: 'text', ...item });
  }

  await run(
    index.updateSettings({
      searchableAttributes: ['content'],
      filterableAttributes: ['id', 'tag', 'locale'],
    }),
  );
  await run(index.addDocuments(documents, { primaryKey: 'id' }));
  // documents left from previous syncs
  await run(index.deleteDocuments({ filter: `id >= ${documents.length}` }));
}

async function run(task: EnqueuedTaskPromise): Promise<void> {
  const { status, error } = await task.waitTask({ timeout: 0 });
  if (status !== 'succeeded')
    throw new Error(error ? error.message : `Meilisearch task ${status}`, { cause: error });
}
