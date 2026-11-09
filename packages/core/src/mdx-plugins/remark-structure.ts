import type { Nodes, Root, TableRow } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Transformer } from 'unified';
import { VFile } from 'vfile';
import { createCodeOutput, esmScope, isJsxElement, toMdxExport } from './utils';
import {
  createStructuredRecords,
  isInline,
  keptElement,
  showCondition,
  toHtmlTag,
} from '../../../shared/code-output';
import type { Analysis } from './stringifier';
import { headingIdRegex, idCodeProperty } from '../../../shared/heading-id';
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
   * Return `true` to keep a JSX element, other elements are replaced by their content. Static analysis keeps them as
   * HTML tags, runtime analysis renders them into Markdown like processed Markdown.
   *
   * Default: static analysis keeps `File`, `TypeTable`, `Callout` and `Card` elements, runtime analysis keeps the
   * elements of components.
   */
  filterElement?: (node: JsxElement) => boolean;

  /**
   * export as `structuredData` (if true) or specified variable name.
   */
  exportAs?: string | boolean;

  /** @defaultValue the analysis of the content source, or `static` */
  analysis?: Analysis;
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
 * With runtime analysis, the export is a function of the props giving the records that show, their expressions and
 * elements render like in processed Markdown. `vfile.data.structuredData` is static.
 *
 * By default, the output is stored into VFile (`vfile.data.structuredData`), you can specify `exportAs` to export it.
 */
export function remarkStructure({
  types = remarkStructureDefaultOptions.types,
  mdxTypes = remarkStructureDefaultOptions.mdxTypes,
  filterElement,
  exportAs = remarkStructureDefaultOptions.exportAs,
  analysis,
}: StructureOptions = {}): Transformer<Root, Root> {
  const isType = Array.isArray(types) ? (node: Nodes) => types.includes(node.type) : types;

  return (tree, file) => {
    const isStatic = (analysis ?? file.data._analysis) !== 'runtime';
    const out = createCodeOutput(file, 'search', isStatic);
    const { s } = out;
    const structured = createStructuredRecords();
    const { push } = structured;
    const scope = isStatic ? new Set<string>() : esmScope(tree);
    const keep =
      filterElement ?? (isStatic ? remarkStructureDefaultOptions.filterElement : undefined);

    // Fumadocs OpenAPI Generated Structured Data
    const openapi = (file.data.frontmatter as { _openapi?: { structuredData?: StructuredData } })
      ?._openapi?.structuredData;
    for (const item of openapi?.headings ?? []) push(item);
    for (const item of openapi?.contents ?? []) push(item);

    const toCells = (row: TableRow) => {
      const cells: string[] = [];
      for (const cell of row.children) cells.push(s.inner(cell).trim());
      return cells;
    };

    // in document order, stringified after the edits of every node
    const records: (() => void)[] = [];
    let covered: { start: number; end: number } | undefined;
    let tables = 0;

    const collect = (node: Nodes, when: string[]) => {
      // links and elements become their content, unless kept, images and ESM (like that of includes) are removed
      if (out.markCode(node)) {
        // rendered from code
      } else if (node.type === 'link' || node.type === 'linkReference')
        s.replace(node, (s) => s.inner(node));
      else if (node.type === 'image' || node.type === 'imageReference' || node.type === 'mdxjsEsm')
        s.replace(node, '');
      else if (isJsxElement(node))
        s.replace(node, (s) => {
          const element = !isStatic && keptElement(node, scope);
          if (!(keep ? keep(node) : element)) return s.inner(node);
          return element ? out.wrap(element, s.inner(node)) : toHtmlTag(node, s.inner(node));
        });

      if (node.data?.structuredData) {
        const items = node.data.structuredData.contents;
        records.push(() => {
          for (const item of items) push(item, when);
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
            push(
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

        const code = node.data?.hProperties?.[idCodeProperty];
        records.push(() => {
          const content = s.inner(node).replace(headingIdRegex, '').trim();
          push({ id, code: typeof code === 'string' ? code : undefined, content }, when);
        });
      } else {
        records.push(() => {
          const content = s.stringify(node).trim();
          if (content.length > 0) push({ heading: undefined, content }, when);
        });
      }
    };
    const visit = (node: Nodes, when: string[]) => {
      collect(node, when);
      if (!('children' in node)) return;
      const condition = showCondition(node);
      for (const child of node.children) visit(child, condition ? [...when, condition] : when);
    };
    visit(tree, []);
    for (const record of records) record();

    const data: StructuredData = structured.toStatic(out);
    file.data.structuredData = data;

    if (!exportAs) return;
    const name = typeof exportAs === 'string' ? exportAs : 'structuredData';
    tree.children.unshift(
      isStatic
        ? toMdxExport(name, data)
        : out.esm(`export const ${name} = ${structured.toCode(out)};`),
    );
  };
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
