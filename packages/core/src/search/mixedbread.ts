import type { SortedResult } from '@/search';
import type Mixedbread from '@mixedbread/sdk';
import type { SearchFilterCondition } from '@mixedbread/sdk/resources/shared';
import type { ScoredTextInputChunk } from '@mixedbread/sdk/resources/stores';
import { createEndpoint } from '@/search/server/endpoint';
import type { SearchAPI } from '@/search/server';
import type { DocumentRecord } from './meilisearch';

export { toDocuments, type DocumentRecord } from './meilisearch';

/**
 * Metadata of the file of a page
 */
export interface SearchMetadata {
  title: string;
  url: string;
  breadcrumbs?: string[];
  tags: string[];
  locale?: string;
  /** hash of its chunks, unchanged pages are skipped */
  hash: string;
}

/**
 * Metadata of a chunk, a search record of its page
 */
interface RecordMetadata {
  kind: SortedResult['type'];
  /** ID of the heading it belongs to */
  heading?: string;
  table?: string;
}

type StoreSearchResult = ScoredTextInputChunk & {
  metadata: SearchMetadata;
  generated_metadata: RecordMetadata;
};

export interface MixedbreadSearchOptions {
  /**
   * The Mixedbread SDK client instance
   */
  client: Mixedbread;

  /**
   * The identifier of the store to search in
   */
  storeIdentifier: string;

  /**
   * Maximum number of results to return, the `limit` of requests can only lower it
   *
   * @defaultValue 10
   */
  topK?: number;

  /**
   * Re-rank search results for improved relevance (this adds latency to the search)
   */
  rerank?: boolean;

  /**
   * Rewrite the query for better search results (this adds latency to the search)
   */
  rewriteQuery?: boolean;

  /**
   * Minimum score threshold for results
   */
  scoreThreshold?: number;

  /**
   * Custom transform function for search results
   */
  transform?: (results: StoreSearchResult[], query: string) => SortedResult[];
}

function defaultTransform(results: StoreSearchResult[]): SortedResult[] {
  // file ID -> the page and its records
  const groups = new Map<string, SortedResult[]>();

  for (const item of results) {
    const page = item.metadata;
    let group = groups.get(item.file_id);
    if (!group) {
      group = [
        {
          id: item.file_id,
          type: 'page',
          content: page.title,
          breadcrumbs: page.breadcrumbs,
          url: page.url,
        },
      ];
      groups.set(item.file_id, group);
    }

    const { kind, heading, table } = item.generated_metadata;
    if (kind === 'page') continue;
    group.push({
      id: `${item.file_id}-${item.chunk_index}`,
      type: kind,
      content: item.text ?? '',
      url: heading ? `${page.url}#${heading}` : page.url,
      table,
    });
  }

  return [...groups.values()].flat();
}

export function createMixedbreadSearchAPI(options: MixedbreadSearchOptions): SearchAPI {
  const {
    client,
    storeIdentifier,
    topK = 10,
    rerank,
    rewriteQuery,
    scoreThreshold,
    transform,
  } = options;

  return createEndpoint({
    async search(query, searchOptions = {}) {
      if (!query.trim()) {
        return [];
      }

      const { tag, locale, limit } = searchOptions;
      const filters: SearchFilterCondition[] = [];
      if (locale) filters.push({ key: 'locale', operator: 'eq', value: locale });
      for (const item of typeof tag === 'string' ? [tag] : (tag ?? []))
        filters.push({ key: 'tags', operator: 'contains', value: item });

      const res = await client.stores.search({
        query,
        store_identifiers: [storeIdentifier],
        top_k: Math.min(limit ?? topK, topK),
        filters: filters.length > 0 ? { all: filters } : undefined,
        search_options: {
          return_metadata: true,
          rerank,
          rewrite_query: rewriteQuery,
          score_threshold: scoreThreshold,
        },
      });

      const results = res.data as StoreSearchResult[];

      if (transform) {
        return transform(results, query);
      }

      return defaultTransform(results);
    },
    async export() {
      throw new Error(
        'Mixedbread search does not support exporting indexes. Use the Mixedbread dashboard to manage your store.',
      );
    },
  });
}

export interface SyncOptions {
  storeIdentifier: string;
  documents: DocumentRecord[];
}

/**
 * Upload a file for each page, whose chunks are the title, headings and paragraphs of the page. Unchanged pages are skipped, files of removed pages are deleted.
 *
 * @param client - Mixedbread client with an API key that can write to the store
 */
export async function sync(client: Mixedbread, options: SyncOptions): Promise<void> {
  const { storeIdentifier, documents } = options;
  // external ID -> the uploaded file
  const files = new Map<string, { id: string; hash?: string }>();
  let after: string | null = null;
  do {
    const res = await client.stores.files.list(storeIdentifier, { limit: 100, after });
    for (const file of res.data) {
      const metadata = file.metadata as Partial<SearchMetadata> | null;
      if (file.external_id) files.set(file.external_id, { id: file.id, hash: metadata?.hash });
    }
    after = res.pagination.has_more ? res.pagination.last_cursor : null;
  } while (after);

  const tasks: (() => Promise<unknown>)[] = [];
  for (const document of documents) {
    const { title, url, breadcrumbs, tag, locale } = document;
    // pages of locales share URLs when locale prefixes are hidden
    const id = locale ? `${locale}:${url}` : url;
    const metadata: Omit<SearchMetadata, 'hash'> = {
      title,
      url,
      breadcrumbs,
      tags: typeof tag === 'string' ? [tag] : (tag ?? []),
      locale,
    };
    const content = JSON.stringify(toChunks(document));
    const hash = await digest(content + JSON.stringify(metadata));
    const previous = files.get(id);
    files.delete(id);
    if (previous?.hash === hash) continue;

    tasks.push(async () => {
      const file = new File([content], `${title}.mxjson`, {
        type: 'application/vnd-mxbai.chunks-json',
      });
      await client.stores.files.upload(storeIdentifier, file, {
        external_id: id,
        metadata: { ...metadata, hash },
      });
      // the file object replaced by external ID stays in the files of organization
      if (previous) await client.files.delete(previous.id);
    });
  }

  // pages removed
  for (const { id } of files.values()) tasks.push(() => client.files.delete(id));
  for (let i = 0; i < tasks.length; i += 10)
    await Promise.all(tasks.slice(i, i + 10).map((task) => task()));
}

function toChunks({ title, description, structured }: DocumentRecord) {
  const chunks: { type: 'text'; text: string; generated_metadata: RecordMetadata }[] = [];
  const add = (text: string, generated_metadata: RecordMetadata) =>
    chunks.push({ type: 'text', text, generated_metadata });

  add(title, { kind: 'page' });
  if (description && !structured.contents.some((item) => item.content === description))
    add(description, { kind: 'text' });
  for (const heading of structured.headings)
    add(heading.content, { kind: 'heading', heading: heading.id });
  for (const { content, heading, table } of structured.contents)
    add(content, { kind: 'text', heading, table });
  return chunks;
}

async function digest(content: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
