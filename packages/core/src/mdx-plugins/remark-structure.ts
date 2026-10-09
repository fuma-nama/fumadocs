import type { Nodes, Root, TableRow } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Transformer } from 'unified';
import { VFile } from 'vfile';
import { isJsxElement, toMdxExport, walk } from './utils';
import { createStringifier, type Stringifier } from './stringifier';
import { headingIdRegex } from './heading-id';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { remarkHeading } from './remark-heading';
import { tableRowToStructuredData } from '@/search';

interface StructuredDataHeading {
  id: string;
  content: string;
}

export interface StructuredDataContent {
  heading: string | undefined;
  content: string;
  /** the table of a table row, unique in its page */
  table?: string;
}

export interface StructuredData {
  headings: StructuredDataHeading[];
  /**
   * Refer to paragraphs, a heading may contain multiple contents as well
   */
  contents: StructuredDataContent[];
}

type JsxElement = MdxJsxFlowElement | MdxJsxTextElement;

export interface StructureOptions {
  /**
   * MDAST node types to be scanned as a content block.
   *
   * If a node's type is listed in this array, it will be converted into a single content block, except tables which become a content block per row, along with the header row.
   *
   * @defaultValue ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement']
   */
  types?: string[] | ((node: Nodes) => boolean);

  /**
   * Whether the MDX element should be treated as a single content block, only effective if `types` has `mdxJsxFlowElement`.
   *
   * Default: return `true` if the element is a leaf node, otherwise `false`.
   */
  mdxTypes?: (node: JsxElement) => boolean;

  /**
   * Return `true` to keep a JSX element as an HTML tag, other elements are replaced by their content.
   *
   * Default: keep `File`, `TypeTable`, `Callout` and `Card` elements.
   */
  filterElement?: (node: JsxElement) => boolean;

  /**
   * export as `structuredData` (if true) or specified variable name.
   */
  exportAs?: string | boolean;
}

declare module 'mdast' {
  interface Data {
    /**
     * [Fumadocs: remark-structure] Items to add to the structured data, in place of the node.
     */
    structuredData?: {
      contents: StructuredDataContent[];
    };
  }
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs: remark-structure] output data.
     */
    structuredData: StructuredData;
  }
}

export const remarkStructureDefaultOptions = {
  types: ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement'],
  mdxTypes(node) {
    return !node.children || node.children.length === 0;
  },
  filterElement(node) {
    switch (node.name) {
      case 'File':
      case 'TypeTable':
      case 'Callout':
      case 'Card':
        return true;
      default:
        return false;
    }
  },
  exportAs: false,
} satisfies StructureOptions;

/**
 * Extract content into structured data, as Markdown sliced from the authored source. Links and JSX elements are
 * replaced by their content, images are removed.
 *
 * By default, the output is stored into VFile (`vfile.data.structuredData`), you can specify `exportAs` to export it.
 */
export function remarkStructure({
  types = remarkStructureDefaultOptions.types,
  mdxTypes = remarkStructureDefaultOptions.mdxTypes,
  filterElement = remarkStructureDefaultOptions.filterElement,
  exportAs = remarkStructureDefaultOptions.exportAs,
}: StructureOptions = {}): Transformer<Root, Root> {
  const isType = Array.isArray(types) ? (node: Nodes) => types.includes(node.type) : types;

  return (tree, file) => {
    const data: StructuredData = { contents: [], headings: [] };
    const s = createStringifier(file, 'search');

    // Fumadocs OpenAPI Generated Structured Data
    if (file.data.frontmatter) {
      const frontmatter = file.data.frontmatter as {
        _openapi?: {
          structuredData?: StructuredData;
        };
      };

      const openapiData = frontmatter._openapi?.structuredData;
      if (openapiData) {
        data.headings.push(...openapiData.headings);
        data.contents.push(...openapiData.contents);
      }
    }

    const toCells = (row: TableRow) => {
      const cells: string[] = [];
      for (const cell of row.children) cells.push(s.inner(cell).trim());
      return cells;
    };

    // in document order, stringified after the edits of every node
    const records: (() => void)[] = [];
    let covered: { start: number; end: number } | undefined;
    let lastHeading: string | undefined;
    let tables = 0;

    const collect = (node: Nodes) => {
      // links and elements become their content, unless kept as HTML tags, images are removed
      if (node.type === 'link' || node.type === 'linkReference')
        s.replace(node, (s) => s.inner(node));
      else if (node.type === 'image' || node.type === 'imageReference') s.replace(node, '');
      else if (isJsxElement(node))
        s.replace(node, filterElement(node) ? (s) => toHtmlTag(node, s) : (s) => s.inner(node));

      const heading = lastHeading;
      if (node.data?.structuredData) {
        const { contents } = node.data.structuredData;
        records.push(() => {
          for (const item of contents)
            data.contents.push({ ...item, heading: item.heading ?? heading });
        });
        covered = s.range(node) ?? covered;
        return;
      }
      if (!isType(node)) return;

      // nodes without a source, generated by plugins, and nodes in a record aren't records
      const range = s.range(node);
      if (!range || (covered && s.within(range, covered))) return;
      if (isJsxElement(node) && !isInline(s.source, range) && !mdxTypes(node)) return;
      covered = range;

      if (node.type === 'table') {
        const table = `table-${tables++}`;
        records.push(() => {
          const [head, ...rows] = node.children;
          const header = toCells(head);
          for (const row of rows)
            data.contents.push(
              tableRowToStructuredData({ table, heading, row: toCells(row), header }),
            );
        });
      } else if (node.type === 'heading') {
        const id = node.data?.hProperties?.id;
        if (typeof id !== 'string') {
          console.warn(
            '[remark-structure] hProperties.id is missing in heading node, it is required to generate heading data. You can add remark-heading prior to remark-structure to generate heading IDs.',
          );
          return;
        }

        lastHeading = id;
        records.push(() => {
          const content = s.inner(node).replace(headingIdRegex, '').trim();
          if (content.length > 0) data.headings.push({ id, content });
        });
      } else {
        records.push(() => {
          const content = s.stringify(node).trim();
          if (content.length > 0) data.contents.push({ heading, content });
        });
      }
    };
    walk<Nodes>(tree, collect);
    for (const record of records) record();

    file.data.structuredData = data;
    if (exportAs) {
      tree.children.unshift(
        toMdxExport(typeof exportAs === 'string' ? exportAs : 'structuredData', data),
      );
    }
  };
}

/** an element on one line has inline content, recorded like a paragraph */
function isInline(source: string, range: { start: number; end: number }): boolean {
  const line = source.indexOf('\n', range.start);
  return line === -1 || line >= range.end;
}

/**
 * A JSX element as an HTML tag, so search dialogs render it as an element. Expression values
 * become strings, values and content are kept on one line, values are truncated.
 */
function toHtmlTag(node: JsxElement, s: Stringifier): string {
  let attrs = '';
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    if (attr.value == null) {
      attrs += ` ${attr.name}`;
      continue;
    }

    let value = (typeof attr.value === 'string' ? attr.value : attr.value.value).replace(
      /\s+/g,
      ' ',
    );
    if (value.length > 100) value = `${value.slice(0, 100)}…`;
    attrs += ` ${attr.name}="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`;
  }

  const children = s.inner(node).replace(/\s+/g, ' ');
  if (!children) return `<${node.name}${attrs} />`;
  return `<${node.name}${attrs}>${children}</${node.name}>`;
}

/**
 * Extract data from markdown/mdx content
 */
export function structure(
  content: string,
  remarkPlugins: PluggableList = [],
  options: StructureOptions = {},
): StructuredData {
  const processor = remark()
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkHeading)
    .use(remarkStructure, options);
  const file = new VFile(content);
  processor.runSync(processor.parse(file), file);

  return file.data.structuredData!;
}
