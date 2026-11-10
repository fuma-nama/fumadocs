import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes, TableRow } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { Analysis } from 'fumadocs-core/mdx-plugins/stringifier';
import { tableRowToStructuredData } from 'fumadocs-core/search';
import { offsets, type Stringifier } from './stringifier';
import { headingIdRegex } from '../../shared/heading-id';
import type { ExtraPluginHooks } from './compile';
import { createCodeOutput, parse, type JsxElementNode } from './utils';
import {
  createStructuredRecords,
  isInline,
  isStaticOutput,
  keptElement,
  moduleScope,
  showConditions,
  toHtmlTag,
} from '../../shared/code-output';

declare module 'satteri' {
  interface DataMap {
    /** the code of structured data rendered from code, exported by `compileMdx` */
    _structuredDataCode?: string;
  }
}

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;

  /**
   * Return `true` to keep a JSX element, other elements are replaced by their content. Static analysis keeps them as
   * HTML tags, runtime analysis renders them into Markdown like processed Markdown.
   *
   * Default: static analysis keeps `File`, `TypeTable`, `Callout` and `Card` elements, runtime analysis keeps the
   * elements of components.
   */
  filterElement?: (node: Nodes & { name?: string | null }) => boolean;

  /**
   * export as `structuredData` (if true) or specified variable name.
   *
   * @default true
   */
  exportAs?: string | boolean;

  /** @defaultValue the analysis of the content source, or `static` */
  analysis?: Analysis;
}

/** the elements that static analysis keeps as HTML tags by default */
function keepByDefault(node: { name?: string | null }): boolean {
  switch (node.name) {
    case 'File':
    case 'TypeTable':
    case 'Callout':
    case 'Card':
      return true;
    default:
      return false;
  }
}

/** the nodes that a function of `types` can match */
const RECORD_VISITORS = [
  'heading',
  'paragraph',
  'blockquote',
  'table',
  'tableCell',
  'mdxJsxFlowElement',
];
/** the nodes edited in records */
const EDIT_VISITORS = [
  'mdxJsxFlowElement',
  'mdxJsxTextElement',
  'mdxTextExpression',
  'mdxFlowExpression',
  'link',
  'linkReference',
  'image',
  'imageReference',
];

interface ContentRecord {
  node: Nodes;
  /** the conditions of the branches of `<show>` around it */
  when: string[];
  /** set for heading records, `code` is the ID as code */
  id?: string;
  code?: string;
  table?: string;
  /** set for generated records */
  content?: string;
  heading?: string;
}

interface TableRecord {
  when: string[];
  table: string;
  head: TableRow;
  rows: TableRow[];
}

/**
 * Extract content into structured data, as Markdown sliced from the authored source. Links and JSX elements are
 * replaced by their content, images are removed.
 *
 * With runtime analysis, the export is a function of the props, rendering authored expressions and the branches of
 * `<show>` that show. `ctx.data.structuredData` has the authored source of expressions and every branch.
 */
export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  filterElement,
  exportAs = true,
  analysis,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const visitors = [...(typeof types === 'function' ? RECORD_VISITORS : types), ...EDIT_VISITORS];

  const plugin: ExtraPluginHooks & { (): MdastPluginDefinition } = () => {
    const records: (ContentRecord | TableRecord)[] = [];
    let covered: { start: number; end: number } | undefined;
    let tables = 0;
    let out: ReturnType<typeof createCodeOutput>;
    let s: Stringifier;
    let isStatic = false;
    /** the names declared by the ESM nodes, complete when records stringify */
    const scope = new Set<string>();
    let keep: StructureOptions['filterElement'];
    const structured = createStructuredRecords();
    const { push } = structured;

    function stringifyCells(row: TableRow): string[] {
      return row.children.map((cell) => s.inner(cell).trim());
    }

    function visit(node: Nodes, ctx: MdastVisitorContext) {
      // links and elements become their content, unless kept, images and ESM (like that of includes) are removed
      if (out.markCode(node)) {
        // rendered from code
      } else if (node.type === 'link' || node.type === 'linkReference')
        s.replace(node, (s) => s.inner(node));
      else if (node.type === 'image' || node.type === 'imageReference') s.replace(node, '');
      else if (isJsxElement(node))
        s.replace(node, (s) => {
          const element = !isStatic && keptElement(node, scope);
          if (!(keep ? keep(node) : element)) return s.inner(node);
          return element ? out.wrap(element, s.inner(node)) : toHtmlTag(node, s.inner(node));
        });

      if (node.data?.structuredData) {
        const when = showConditions(node, ctx);
        for (const { heading, content, table } of node.data.structuredData.contents)
          records.push({ node, when, heading, table, content });
        covered = offsets(node) ?? covered;
        return;
      }
      if (!matchType(node)) return;

      // nodes without a source, generated by plugins, and nodes in a record aren't records
      const range = offsets(node);
      if (!range || (covered && s.within(range, covered))) return;
      if (isJsxElement(node) && !isInline(s.source, range) && !mdxTypes(node)) return;
      covered = range;
      const when = showConditions(node, ctx);

      if (node.type === 'table') {
        const [head, ...rows] = node.children;
        records.push({ when, table: `table-${tables++}`, head, rows });
        return;
      }

      if (node.type === 'heading') {
        const id = (node.data as { hProperties?: { id?: unknown } } | undefined)?.hProperties?.id;
        if (typeof id === 'string' && id)
          records.push({ node, when, id, code: ctx.data._headingIds?.[id] });
        return;
      }

      records.push({ node, when });
    }

    return {
      name: 'remark-structure',
      // positions tell authored nodes from generated ones
      options: { position: true },
      before(_root: unknown, ctx: MdastVisitorContext) {
        isStatic = isStaticOutput(analysis, ctx.data);
        keep = filterElement ?? (isStatic ? keepByDefault : undefined);
        out = createCodeOutput(ctx, 'search', isStatic);
        s = out.s;

        // Fumadocs OpenAPI Generated Structured Data
        const openapi = (ctx.data.frontmatter as { _openapi?: { structuredData?: StructuredData } })
          ?._openapi?.structuredData;
        for (const item of openapi?.headings ?? []) push(item);
        for (const item of openapi?.contents ?? []) push(item);
      },
      after(_root, ctx) {
        for (const record of records) {
          if ('rows' in record) {
            const header = stringifyCells(record.head);
            for (const row of record.rows)
              push(
                tableRowToStructuredData({ table: record.table, row: stringifyCells(row), header }),
                record.when,
              );
          } else if (record.content !== undefined) {
            const { heading, content, table, when } = record;
            push({ heading, content, table }, when);
          } else if (record.id) {
            const content = s.inner(record.node).replace(headingIdRegex, '').trim();
            push({ id: record.id, code: record.code, content }, record.when);
          } else {
            const content = s.stringify(record.node).trim();
            if (content.length > 0) push({ heading: undefined, content }, record.when);
          }
        }

        ctx.data.structuredData ??= structured.toStatic(out);
        if (exportAs && !isStatic) ctx.data._structuredDataCode = structured.toCode(out);
      },
      mdxjsEsm(node) {
        s.replace(node, '');
        if (!isStatic) moduleScope(parse(node.value).body, scope);
      },
      ...Object.fromEntries(visitors.map((key) => [key, visit])),
    };
  };
  plugin.collectExports = ({ data, addExport }) => {
    if (exportAs) {
      addExport(
        typeof exportAs === 'string' ? exportAs : 'structuredData',
        data._structuredDataCode ??
          JSON.stringify(data.structuredData ?? { headings: [], contents: [] }),
      );
    }
  };
  return plugin;
}

export type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';

function isJsxElement(node: Nodes): node is Nodes & JsxElementNode {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}
