import type { AnyObject, OramaCloud } from '@orama/core';
import type { StructuredData } from '@/mdx-plugins';

export interface SyncOptions {
  /**
   * Index name to sync
   */
  index: string;

  documents: OramaDocument[];

  /**
   * Deploy changes
   *
   * @defaultValue true
   */
  autoDeploy?: boolean;
}

export type I18nSyncOptions = Omit<SyncOptions, 'index' | 'documents'> & {
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
};

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
}

export async function sync(
  cloudManager: OramaCloud,
  options: SyncOptions,
): Promise<void> {
  const { autoDeploy = true } = options;
  const index = cloudManager.index.set(options.index);

  // Open a new Orama transaction.
  // This will create a hidden, temporary empty index we can push new documents to.
  await index.transaction.open();

  // Insert the documents into the temporary index.
  await index.transaction.insertDocuments(
    options.documents.flatMap(toIndex) as unknown as AnyObject[],
  );

  // Commit the transaction.
  // This will swap the live index with the temporary index with no downtime.
  if (autoDeploy) await index.transaction.commit();
}

export async function syncI18n(
  cloudManager: OramaCloud,
  options: I18nSyncOptions,
): Promise<void> {
  const { autoDeploy = true } = options;

  const tasks = options.documents.map(async (document) => {
    const index = cloudManager.index.set(options.indexes[document.locale]);

    await index.transaction.open();
    await index.transaction.insertDocuments(
      document.items.flatMap(toIndex) as unknown as AnyObject[],
    );

    if (autoDeploy) await index.transaction.commit();
  });

  await Promise.all(tasks);
}

function toIndex(page: OramaDocument): OramaIndex[] {
  let id = 0;
  const indexes: OramaIndex[] = [];
  const scannedHeadings = new Set<string>();

  function createIndex(
    section: string | undefined,
    sectionId: string | undefined,
    content: string,
  ): OramaIndex {
    return {
      id: `${page.id}-${(id++).toString()}`,
      title: page.title,
      url: page.url,
      page_id: page.id,
      tag: page.tag,
      section,
      section_id: sectionId,
      content,
      breadcrumbs: page.breadcrumbs,
      ...page.extra_data,
    };
  }

  if (page.description)
    indexes.push(createIndex(undefined, undefined, page.description));

  page.structured.contents.forEach((p) => {
    const heading = p.heading
      ? page.structured.headings.find((h) => p.heading === h.id)
      : null;

    const index = createIndex(heading?.content, heading?.id, p.content);

    if (heading && !scannedHeadings.has(heading.id)) {
      scannedHeadings.add(heading.id);

      indexes.push(createIndex(heading.content, heading.id, heading.content));
    }

    indexes.push(index);
  });

  return indexes;
}
