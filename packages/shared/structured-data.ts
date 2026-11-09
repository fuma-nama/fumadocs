import { createElement, type ElementType, type ReactNode } from 'react';
import { jsxComponents, renderToMarkdownSync } from 'fumadocs-core/server';
import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';

/** a record of the runtime structured data from `remarkStructure`, a heading has an `id` */
export interface StructuredRecord extends Partial<Omit<StructuredDataContent, 'content'>> {
  id?: string;
  content: ReactNode;
}

/** the export of runtime structured data: the records that show for the props of a page, in document order */
export type StructuredRecords = (props: Record<string, unknown>) => StructuredRecord[];

/**
 * The structured data of a page for its props: records render into Markdown with the MDX components of the props,
 * content goes under the last heading before it, records are trimmed and empty ones are left out.
 */
export function toStructuredData(
  records: StructuredRecords,
  props: Record<string, unknown>,
): StructuredData {
  const list = records({
    ...props,
    // missing components are kept as JSX syntax
    components: jsxComponents(props.components as Record<string, ElementType> | undefined),
  });
  const data: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;
  for (const record of list) {
    const content = (
      typeof record.content === 'string'
        ? record.content
        : // inline content, so elements stay on one line like search dialogs show them
          renderToMarkdownSync(createElement('span', null, record.content))
    ).trim();
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
