import { createElement, type ElementType, type ReactNode } from 'react';
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
 * Render the structured data of a page for its props, like its processed Markdown: content goes under the last heading
 * before it, records are trimmed and empty ones are left out.
 */
export async function renderStructuredData(
  records: StructuredRecords,
  props: Record<string, unknown>,
): Promise<StructuredData> {
  const { jsxComponents, renderToMarkdown } = await import('fumadocs-core/server');
  const list = records({
    ...props,
    // missing components are kept as JSX syntax
    components: jsxComponents(props.components as Record<string, ElementType> | undefined),
  });
  const rendered = await Promise.all(
    list.map((record) =>
      typeof record.content === 'string'
        ? record.content
        : // inline content, so elements stay on one line like search dialogs show them
          renderToMarkdown(createElement('span', null, record.content)),
    ),
  );
  const data: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const content = rendered[i].trim();
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
