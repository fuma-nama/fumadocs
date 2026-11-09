import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';

/** a record of the runtime structured data from `remarkStructure`, a heading has an `id` */
export interface StructuredRecord extends Partial<StructuredDataContent> {
  id?: string;
  content: string;
}

/**
 * The structured data of records in document order: content goes under the last heading before it, records are trimmed
 * and empty ones are left out.
 */
export function toStructuredData(records: StructuredRecord[]): StructuredData {
  const data: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;
  for (const record of records) {
    const content = record.content.trim();
    if (record.id !== undefined) {
      heading = record.id;
      if (content) data.headings.push({ id: record.id, content });
    } else if (content) {
      const item: StructuredDataContent = { heading: record.heading ?? heading, content };
      if (record.table) item.table = record.table;
      data.contents.push(item);
    }
  }
  return data;
}
