import type { CloudManager } from '@oramacloud/client';
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

  /**
   * Heading (anchor) id
   */
  section_id?: string;

  content: string;
}

export async function sync(
  cloudManager: CloudManager,
  options: SyncOptions,
): Promise<void> {
  const { autoDeploy = true } = options;
  const index = cloudManager.index(options.index);

  await index.snapshot(options.documents.flatMap(toIndex));
  if (autoDeploy) await index.deploy();
}

const a = {
  id: 'string',
  title: 'string',
  url: 'string',
  tag: 'string',
  page_id: 'string',
  section: 'string',
  section_id: 'string',
  content: 'string',
};

export async function syncI18n(
  cloudManager: CloudManager,
  options: I18nSyncOptions,
): Promise<void> {
  const { autoDeploy = true } = options;

  const tasks = options.documents.map(async (document) => {
    const index = cloudManager.index(options.indexes[document.locale]);

    await index.snapshot(document.items.flatMap(toIndex));
    if (autoDeploy) await index.deploy();
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
