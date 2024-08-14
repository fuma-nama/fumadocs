import type { SearchClient } from 'algoliasearch';
import type { StructuredData } from '@/mdx-plugins/remark-structure';

interface DocumentRecord {
  /**
   * The ID of document, must be unique
   */
  _id: string;

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

export interface SyncOptions {
  /**
   * Index Name for documents
   */
  document?: string;

  /**
   * Search indexes
   */
  documents: DocumentRecord[];
}

/**
 * Update index settings and replace all objects
 *
 * @param client - Algolia Admin Client
 * @param options - Index Options
 */
export async function sync(
  client: SearchClient,
  options: SyncOptions,
): Promise<void> {
  const { document = 'document', documents } = options;

  await setIndexSettings(document, client);
  await updateDocuments(document, client, documents);
}

export async function setIndexSettings(
  indexName: string,
  client: SearchClient,
): Promise<void> {
  await client.setSettings({
    indexName,
    indexSettings: {
      attributeForDistinct: 'page_id',
      attributesToRetrieve: [
        'title',
        'section',
        'content',
        'url',
        'section_id',
      ],
      searchableAttributes: ['title', 'section', 'content'],
      attributesToSnippet: [],
      attributesForFaceting: ['tag'],
    },
  });
}

function toIndex(page: DocumentRecord): BaseIndex[] {
  let id = 0;
  const indexes: BaseIndex[] = [];
  const scannedHeadings = new Set<string>();

  function createIndex(
    section: string | undefined,
    sectionId: string | undefined,
    content: string,
  ): BaseIndex {
    return {
      objectID: `${page._id}-${(id++).toString()}`,
      title: page.title,
      url: page.url,
      page_id: page._id,
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

export async function updateDocuments(
  indexName: string,
  client: SearchClient,
  documents: DocumentRecord[],
): Promise<void> {
  const objects = documents.flatMap(toIndex);

  await client.replaceAllObjects({
    indexName,
    objects,
  });
}

export interface BaseIndex {
  objectID: string;
  title: string;
  url: string;
  tag?: string;

  /**
   * The id of page, used for distinct
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
