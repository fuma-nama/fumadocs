import type { Nodes, Root, TableRow } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Transformer } from 'unified';
import { VFile } from 'vfile';
import type { Expression } from 'estree-jsx';
import {
  and,
  chunksToExpression,
  createCodeOutput,
  guardedArray,
  isJsxElement,
  property,
  propsFunction,
  showCondition,
  toMdxExport,
  toMdxExportRaw,
} from './utils';
import type { Stringifier } from './stringifier';
import { headingIdRegex } from './heading-id';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import { remarkHeading } from './remark-heading';
import { tableRowToStructuredData } from '@/search';
import { valueToEstree } from 'estree-util-value-to-estree';

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
   * @defaultValue ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement', 'mdxFlowExpression']
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
  types: ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement', 'mdxFlowExpression'],
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
 * Authored expressions and the branches of `<show>` checked when rendering are rendered from code: the export is then
 * a function of the props, its content can be React nodes, rendered into Markdown by the source. `vfile.data.structuredData`
 * has the authored source of expressions and every branch.
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
    const out = createCodeOutput(file, 'search');
    const { s } = out;
    /** headings and contents in document order, their content with the markers of code */
    const headings: { id: string; content: string; when: Expression[] }[] = [];
    const contents: (StructuredDataContent & { when: Expression[]; after: number })[] = [];
    const pushContent = (item: StructuredDataContent, when: Expression[]) =>
      contents.push({ ...item, when, after: headings.length });

    // Fumadocs OpenAPI Generated Structured Data
    const openapi = (file.data.frontmatter as { _openapi?: { structuredData?: StructuredData } })
      ?._openapi?.structuredData;
    for (const item of openapi?.headings ?? []) headings.push({ ...item, when: [] });
    for (const item of openapi?.contents ?? []) pushContent(item, []);

    const toCells = (row: TableRow) => {
      const cells: string[] = [];
      for (const cell of row.children) cells.push(s.inner(cell).trim());
      return cells;
    };

    // in document order, stringified after the edits of every node
    const records: (() => void)[] = [];
    let covered: { start: number; end: number } | undefined;
    let tables = 0;

    const collect = (node: Nodes, when: Expression[]) => {
      // links and elements become their content, unless kept as HTML tags, images are removed
      if (out.markCode(node)) {
        // rendered from code
      } else if (node.type === 'link' || node.type === 'linkReference')
        s.replace(node, (s) => s.inner(node));
      else if (node.type === 'image' || node.type === 'imageReference') s.replace(node, '');
      else if (isJsxElement(node))
        s.replace(node, filterElement(node) ? (s) => toHtmlTag(node, s) : (s) => s.inner(node));

      if (node.data?.structuredData) {
        const items = node.data.structuredData.contents;
        records.push(() => {
          for (const item of items) pushContent(item, when);
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
            pushContent(
              tableRowToStructuredData({ table, heading: undefined, row: toCells(row), header }),
              when,
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

        records.push(() => {
          const content = s.inner(node).replace(headingIdRegex, '').trim();
          headings.push({ id, content, when });
        });
      } else {
        records.push(() => {
          const content = s.stringify(node).trim();
          if (content.length > 0) pushContent({ heading: undefined, content }, when);
        });
      }
    };
    const visit = (node: Nodes, when: Expression[]) => {
      collect(node, when);
      if (!('children' in node)) return;
      const condition = isJsxElement(node) ? showCondition(node) : undefined;
      for (const child of node.children) visit(child, condition ? [...when, condition] : when);
    };
    visit(tree, []);
    for (const record of records) record();

    const data: StructuredData = { contents: [], headings: [] };
    for (const { id, content } of headings)
      if (content) data.headings.push({ id, content: out.toStatic(content) });
    for (const { when: _, after, heading = headings[after - 1]?.id, ...item } of contents)
      data.contents.push({ heading, ...item, content: out.toStatic(item.content) });
    file.data.structuredData = data;

    if (!exportAs) return;
    const name = typeof exportAs === 'string' ? exportAs : 'structuredData';
    if (!out.dynamic) {
      tree.children.unshift(toMdxExport(name, data));
      return;
    }

    /**
     * The heading of content: the last heading before it that shows with it, the conditions of the branches decide
     * those in other branches.
     */
    function headingOf(when: Expression[], after: number): Expression {
      let value: Expression = { type: 'Identifier', name: 'undefined' };
      let i = after - 1;
      for (; i >= 0; i--) {
        if (!and(headings[i].when.filter((item) => !when.includes(item)))) {
          value = { type: 'Literal', value: headings[i].id };
          break;
        }
      }
      for (let j = i + 1; j < after; j++) {
        const test = and(headings[j].when.filter((item) => !when.includes(item)))!;
        value = {
          type: 'ConditionalExpression',
          test,
          consequent: { type: 'Literal', value: headings[j].id },
          alternate: value,
        };
      }
      return value;
    }

    const code = (content: string) => property('content', chunksToExpression(out.chunks(content)));
    const headingList: { value: Expression; when: Expression[] }[] = [];
    for (const { id, content, when } of headings) {
      if (!content) continue;
      headingList.push({
        value: {
          type: 'ObjectExpression',
          properties: [property('id', { type: 'Literal', value: id }), code(content)],
        },
        when,
      });
    }
    const contentList: { value: Expression; when: Expression[] }[] = [];
    for (const { when, after, heading, table, content } of contents) {
      const properties = [
        property('heading', heading === undefined ? headingOf(when, after) : toObject(heading)),
        code(content),
      ];
      if (table) properties.push(property('table', { type: 'Literal', value: table }));
      contentList.push({ value: { type: 'ObjectExpression', properties }, when });
    }
    tree.children.unshift(
      toMdxExportRaw(
        name,
        propsFunction({
          type: 'ObjectExpression',
          properties: [
            property('headings', guardedArray(headingList)),
            property('contents', guardedArray(contentList)),
          ],
        }),
      ),
    );
  };
}

function toObject(value: unknown): Expression {
  return valueToEstree(value) as Expression;
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
