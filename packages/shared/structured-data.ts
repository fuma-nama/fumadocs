import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';

/** a record of structured data that `remarkStructure` exports for props, a heading has an `id` */
interface StructuredRecord extends Partial<Omit<StructuredDataContent, 'content'>> {
  id?: string;
  /** text, or an array of its parts: like in React, only strings and numbers are text */
  content: unknown;
}

/** the export of `remarkStructure` for props: the records that show for the props of a page, in document order */
export type StructuredRecords = (props: Record<string, unknown>) => StructuredRecord[];

/** The structured data of a page for its props, from the export of `remarkStructure`. */
export function readStructuredData(
  data: StructuredData | StructuredRecords,
  props: Record<string, unknown>,
): StructuredData {
  if (typeof data !== 'function') return data;
  const records = data(props);
  const contents: string[] = [];
  for (const { content } of records) contents.push(toText(content));
  return toStructuredData(records, contents);
}

/** @deprecated same as {@link readStructuredData}, until its callers move to it */
export async function renderStructuredData(
  data: StructuredData | StructuredRecords,
  props: Record<string, unknown>,
): Promise<StructuredData> {
  return readStructuredData(data, props);
}

function toText(content: unknown): string {
  if (typeof content === 'string' || typeof content === 'number') return String(content);
  let out = '';
  if (Array.isArray(content)) for (const part of content) out += toText(part);
  return out;
}

/**
 * Structured data from its records in document order and their content as text: content goes under the last heading
 * before it, records are trimmed and empty ones are left out.
 */
export function toStructuredData(
  records: readonly { id?: string; heading?: string; table?: string }[],
  contents: string[],
): StructuredData {
  const data: StructuredData = { contents: [], headings: [] };
  let heading: string | undefined;
  for (let i = 0; i < records.length; i++) {
    const { id, table, heading: own = heading } = records[i];
    const content = contents[i].trim();
    if (id !== undefined) heading = id;
    if (!content) continue;
    if (id !== undefined) data.headings.push({ id, content });
    else data.contents.push(table ? { heading: own, content, table } : { heading: own, content });
  }
  return data;
}
