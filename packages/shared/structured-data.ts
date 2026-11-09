import { createElement, isValidElement, type ElementType, type ReactNode } from 'react';
import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';
import { toHtmlTag } from './code-output';

/** a record of the runtime structured data from `remarkStructure`, a heading has an `id` */
export interface StructuredRecord extends Partial<Omit<StructuredDataContent, 'content'>> {
  id?: string;
  content: ReactNode;
}

/** the export of runtime structured data: the records that show for the props of a page, in document order */
export type StructuredRecords = (props: Record<string, unknown>) => StructuredRecord[];

/** content goes under the last heading before it, records are trimmed and empty ones are left out */
function toStructuredData(list: StructuredRecord[], contents: string[]): StructuredData {
  const data: StructuredData = { headings: [], contents: [] };
  let heading: string | undefined;
  for (let i = 0; i < list.length; i++) {
    const record = list[i];
    const content = contents[i].trim();
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

/** Render the structured data of a page for its props, like its processed Markdown. */
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
  return toStructuredData(list, rendered);
}

/** every MDX component is the name of its tag */
const tags = new Proxy({}, { get: (_, name) => name });

/**
 * Read the structured data of a page for its props without rendering it: components don't run, they stay as HTML tags
 * like search dialogs show them.
 */
export function readStructuredData(
  records: StructuredRecords,
  props: Record<string, unknown>,
): StructuredData {
  const list = records({ ...props, components: tags });
  return toStructuredData(
    list,
    list.map((record) => toText(record.content)),
  );
}

function toText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    let out = '';
    for (const child of node as ReactNode[]) out += toText(child);
    return out;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return '';

  const { children, ...props } = node.props;
  const inner = toText(children as ReactNode);
  const { type } = node as { type: string | { displayName?: string; name?: string } };
  const name = typeof type === 'string' ? type : (type.displayName ?? type.name);
  // fragments and HTML elements are their content
  if (!name || /^[a-z]/.test(name)) return inner;

  const attributes = [];
  for (const key in props) {
    const value = props[key];
    if (typeof value === 'string' || typeof value === 'number' || value === true)
      attributes.push({
        type: 'mdxJsxAttribute',
        name: key,
        value: value === true ? null : String(value),
      });
  }
  return toHtmlTag({ type: 'mdxJsxFlowElement', name, attributes }, inner);
}
