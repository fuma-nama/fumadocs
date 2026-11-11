import { isValidElement, type ElementType, type ReactNode } from 'react';
import type {
  StructuredData,
  StructuredDataContent,
} from 'fumadocs-core/mdx-plugins/remark-structure';
import { toHtmlTag } from './code-output';
import { toStructuredData } from './structured-records';

/** a record of structured data that `remarkStructure` exports for props, a heading has an `id` */
interface StructuredRecord extends Partial<Omit<StructuredDataContent, 'content'>> {
  id?: string;
  content: ReactNode;
}

/** the export of `remarkStructure` for props: the records that show for the props of a page, in document order */
export type StructuredRecords = (props: Record<string, unknown>) => StructuredRecord[];

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
        : renderToMarkdown(record.content, { target: 'search' }),
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

/** the text of nodes without rendering them, the elements of components are HTML tags */
function toText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) {
    let out = '';
    for (const child of node as ReactNode[]) out += toText(child);
    return out;
  }
  if (!isValidElement<Record<string, unknown>>(node)) return '';

  const { props } = node;
  const inner = toText(props.children as ReactNode);
  const { type } = node as { type: string | { displayName?: string; name?: string } };
  const name = typeof type === 'string' ? type : (type.displayName ?? type.name);
  // fragments and HTML elements are their content
  if (!name || /^[a-z]/.test(name)) return inner;

  return toHtmlTag(name, props, inner);
}
