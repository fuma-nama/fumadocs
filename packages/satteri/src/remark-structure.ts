import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes, Table, TableRow } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createStringifier, formatTable, offsets, type Stringifier } from './stringifier';
import type { ExtraPluginHooks } from './compile';

export interface StructureOptions {
  /**
   * Node types recorded as a content block. Tables become a content block per row, along with the header row.
   */
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
  heading: string | undefined;
  /** set for heading records */
  id?: string;
  /** stringified once all edits are recorded */
  content: () => string;
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
    const records: ContentRecord[] = [];
    let lastHeading: string | undefined;
    let s: Stringifier;

    /** the header row of a table, and `row` if specified */
    function toTable(table: Table, row: TableRow | undefined, ctx: MdastVisitorContext): string {
      const [head, body] = table.children;
      const start = offsets(table)?.start;
      if (stringify && start !== undefined) {
        if (!row) return s.stringify(table);

        const end = offsets(body)?.start;
        if (end !== undefined && offsets(row)) return s.slice(start, end) + s.stringify(row);
      }

      const rows: string[][] = [];
      for (const { children } of row ? [head, row] : [head]) {
        const cells: string[] = [];
        for (const cell of children) cells.push(ctx.textContent(cell));
        rows.push(cells);
      }
      return formatTable(rows);
    }

    function visit(node: Nodes, ctx: MdastVisitorContext) {
      if (stringify && (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement')) {
        // elements without a Markdown form become their text content in records
        if (!filterElement?.(node)) s.flatten(node);
      }

      if (node.data?.structuredData) {
        for (const { heading, content } of node.data.structuredData.contents) {
          records.push({ heading: heading ?? lastHeading, content: () => content });
        }
      }

      if (!matchType(node)) return;
      if (node.type === 'table') {
        if (node.children.length === 1) {
          records.push({ heading: lastHeading, content: () => toTable(node, undefined, ctx) });
        }

        for (let i = 1; i < node.children.length; i++) {
          const row = node.children[i];
          records.push({ heading: lastHeading, content: () => toTable(node, row, ctx) });
        }
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

        // heading text is already plain, remark-heading stripped its markers
        records.push({ heading: undefined, id, content: () => ctx.textContent(node) });
        lastHeading = id;
        return;
      }

      records.push({
        heading: lastHeading,
        content: () => (stringify ? s.stringify(node) : ctx.textContent(node)),
      });
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
      after() {
        for (const record of records) {
          const content = record.content().trim();
          if (content.length === 0) continue;

          if (record.id) data.headings.push({ id: record.id, content });
          else data.contents.push({ heading: record.heading, content });
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
