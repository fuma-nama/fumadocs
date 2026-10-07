import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes, TableRow } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { tableRowToStructuredData } from 'fumadocs-core/search';
import { createStringifier, offsets, type Stringifier } from './stringifier';
import type { ExtraPluginHooks } from './compile';

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;

  /**
   * Include Markdown syntax in content records, sliced from the authored source.
   *
   * Links and JSX elements are flattened into their plain text, return `true` from
   * `filterElement` to keep an element's syntax instead.
   */
  stringify?:
    | boolean
    | {
        filterElement?: (node: Nodes & { name?: string | null }) => boolean;
      };

  /**
   * export as `structuredData` (if true) or specified variable name.
   *
   * @default true
   */
  exportAs?: string | boolean;
}

const STRUCTURE_VISITORS = [
  'heading',
  'paragraph',
  'blockquote',
  'table',
  'tableCell',
  'mdxJsxFlowElement',
] as const;

interface ContentRecord {
  node: Nodes;
  heading: string | undefined;
  /** set for heading records */
  id?: string;
  table?: string;
  /** set for generated records */
  content?: string;
}

interface TableRecord {
  heading: string | undefined;
  table: string;
  head: TableRow;
  rows: TableRow[];
}

export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  stringify = false,
  exportAs = true,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const filterElement = typeof stringify === 'object' ? stringify.filterElement : undefined;

  const plugin: ExtraPluginHooks & { (): MdastPluginDefinition } = () => {
    const data: StructuredData = { contents: [], headings: [] };
    const records: (ContentRecord | TableRecord)[] = [];
    let lastHeading: string | undefined;
    let tables = 0;
    let s: Stringifier;

    function stringifyCells(row: TableRow, ctx: MdastVisitorContext): string[] {
      return row.children.map((cell) => {
        // a cell spans its pipes, slice its content instead
        const first = cell.children[0];
        const last = cell.children[cell.children.length - 1];
        const start = stringify && first ? offsets(first)?.start : undefined;
        const end = last && offsets(last)?.end;
        if (start !== undefined && end !== undefined) return s.slice(start, end).trim();
        return ctx.textContent(cell).trim();
      });
    }

    function visit(node: Nodes) {
      if (stringify && (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement')) {
        // elements without a Markdown form become their text content in records
        if (!filterElement?.(node)) s.flatten(node);
      }

      // generated records, in place of the node
      if (node.data?.structuredData) {
        for (const { heading, content, table } of node.data.structuredData.contents)
          records.push({ node, heading: heading ?? lastHeading, table, content });
        return;
      }

      if (!matchType(node)) return;
      if (node.type === 'table') {
        const [head, ...rows] = node.children;
        records.push({ heading: lastHeading, table: `table-${tables++}`, head, rows });
        return;
      }
      if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        !mdxTypes(node)
      )
        return;

      if (node.type === 'heading') {
        const id = (node.data as { hProperties?: { id?: string } } | undefined)?.hProperties?.id;
        if (!id) return;

        records.push({ node, heading: undefined, id });
        lastHeading = id;
        return;
      }

      records.push({ node, heading: lastHeading });
    }

    const definition: MdastPluginDefinition = {
      name: 'remark-structure',
      options: stringify ? { position: true } : undefined,
      before(_root: unknown, ctx: MdastVisitorContext) {
        ctx.data.structuredData ??= data;
        s = createStringifier(ctx);

        const frontmatter = ctx.data.frontmatter as
          | { _openapi?: { structuredData?: StructuredData } }
          | undefined;
        const openapiData = frontmatter?._openapi?.structuredData;
        if (openapiData) {
          data.headings.push(...openapiData.headings);
          data.contents.push(...openapiData.contents);
        }
      },
      after(_root: unknown, ctx: MdastVisitorContext) {
        for (const record of records) {
          if ('rows' in record) {
            const header = stringifyCells(record.head, ctx);
            for (const row of record.rows)
              data.contents.push(
                tableRowToStructuredData({
                  table: record.table,
                  heading: record.heading,
                  row: stringifyCells(row, ctx),
                  header,
                }),
              );
            continue;
          }

          // heading text is already plain, remark-heading stripped its markers
          const content = (
            record.content ??
            (stringify && !record.id ? s.stringify(record.node) : ctx.textContent(record.node))
          ).trim();
          if (content.length === 0) continue;

          if (record.id) data.headings.push({ id: record.id, content });
          else data.contents.push({ heading: record.heading, content, table: record.table });
        }
      },
      ...Object.fromEntries(STRUCTURE_VISITORS.map((key) => [key, visit])),
    };
    if (stringify) {
      // flattened in records; links & images have no position once plugins replaced them
      Object.assign(definition, {
        mdxJsxTextElement: visit,
        link: (node: Nodes) => s.flatten(node),
        linkReference: (node: Nodes) => s.flatten(node),
        image: (node: Nodes) => s.remove(node),
      });
    }

    return definition;
  };
  plugin.collectExports = ({ data, addExport }) => {
    if (exportAs) {
      addExport(
        typeof exportAs === 'string' ? exportAs : 'structuredData',
        JSON.stringify(data.structuredData ?? { headings: [], contents: [] }),
      );
    }
  };
  return plugin;
}

export type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
