import type { StructuredData } from '@/mdx-plugins';
import type { AnyObject, OramaCloud, Transaction } from '@orama/core';
import type { LoaderConfig, LoaderOutput } from '@/source/loader';
import type { Awaitable } from '@/types';
import { buildDocuments } from './server/build-index';
import { recordId } from './server/build-doc';

export interface SyncOptions {
  /**
   * Index name to sync
   */
  index: string;

  documents: OramaDocument[];

  /**
   * Commit the transaction, which replaces the live index. When `false`, commit or roll back the transaction that `sync()` returns.
   *
   * @defaultValue true
   */
  autoDeploy?: boolean;
}

export interface I18nSyncOptions extends Omit<SyncOptions, 'index' | 'documents'> {
  /**
   * Indexes to sync.
   *
   * Pairs of `locale`-`index`.
   **/
  indexes: Record<string, string>;

  documents: {
    locale: string;
    items: OramaDocument[];
  }[];
}

export interface OramaDocument {
  /**
   * The ID of document, must be unique
   */
  id: string;

  title: string;
  description?: string;

  /**
   * URL to the page
   */
  url: string;
  structured: StructuredData;

  /**
   * Tag to filter results
   */
  tag?: string;

  /**
   * Data to be added to each section index
   */
  extra_data?: object;
  breadcrumbs?: string[];
}

export interface OramaIndex {
  id: string;

  title: string;
  url: string;

  tag?: string;

  /**
   * The id of page, used for `group by`
   */
  page_id: string;

  /**
   * Heading content
   */
  section?: string;

  breadcrumbs?: string[];

  /**
   * Heading (anchor) id
   */
  section_id?: string;

  content: string;
  table?: string;
}

/**
 * Build the search indexes of every page in a source.
 */
export function toDocuments<C extends LoaderConfig>(
  source: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  options: {
    /** Tag to filter results by. */
    tag?: (page: C['page']) => string;
  } = {},
): Promise<OramaDocument[]> {
  return buildDocuments(source, (index, page) => ({
    id: index.id,
    title: index.title,
    description: index.description,
    url: index.url,
    structured: index.structuredData,
    tag: options.tag?.(page),
  }));
}

/**
 * Replace the documents of an index in a transaction.
 *
 * @returns the transaction, commit it to deploy the documents when `autoDeploy` is `false`
 */
export async function sync(orama: OramaCloud, options: SyncOptions): Promise<Transaction> {
  const { autoDeploy = true } = options;
  const { transaction } = orama.index.set(options.index);
  await transaction.open();
  await transaction.insertDocuments(options.documents.flatMap(toIndex) as unknown as AnyObject[]);

  if (autoDeploy) await transaction.commit();
  return transaction;
}

/**
 * Like `sync()`, for the index of each locale.
 *
 * @returns the transaction of each locale
 */
export async function syncI18n(
  orama: OramaCloud,
  { indexes, documents, ...options }: I18nSyncOptions,
): Promise<Record<string, Transaction>> {
  const transactions: Record<string, Transaction> = {};
  await Promise.all(
    documents.map(async ({ locale, items }) => {
      transactions[locale] = await sync(orama, {
        ...options,
        index: indexes[locale],
        documents: items,
      });
    }),
  );
  return transactions;
}

function toIndex(page: OramaDocument): OramaIndex[] {
  let id = 0;
  const indexes: OramaIndex[] = [];
  const scannedHeadings = new Set<string>();

  function createIndex(
    section: string | undefined,
    sectionId: string | undefined,
    content: string,
    table?: string,
  ): OramaIndex {
    return {
      id: recordId(page.id, id++),
      title: page.title,
      url: page.url,
      page_id: page.id,
      tag: page.tag,
      section,
      section_id: sectionId,
      content,
      table,
      breadcrumbs: page.breadcrumbs,
      ...page.extra_data,
    };
  }

  if (page.description) indexes.push(createIndex(undefined, undefined, page.description));

  page.structured.contents.forEach((p) => {
    const heading = p.heading ? page.structured.headings.find((h) => p.heading === h.id) : null;

    const index = createIndex(heading?.content, p.heading, p.content, p.table);

    if (heading && !scannedHeadings.has(heading.id)) {
      scannedHeadings.add(heading.id);

      indexes.push(createIndex(heading.content, heading.id, heading.content));
    }

    indexes.push(index);
  });

  return indexes;
}
