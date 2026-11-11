import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { tableRowToStructuredData } from 'fumadocs-core/search';
import type { ExtraPluginHooks } from './compile';
import { createCodeOutput, esmScope } from './utils';
import { isStaticOutput, showConditions } from '../../shared/show';
import { createStructuredRecords } from '../../shared/structured-records';

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
   * Return `true` to keep a JSX element, other elements are replaced by their content. Kept elements are HTML tags, or
   * render into Markdown like processed Markdown when the export is a function of the props.
   *
   * Default: `File`, `TypeTable`, `Callout` and `Card` elements, or the elements of components when the export is a
   * function of the props.
   */
  filterElement?: (node: Nodes & { name?: string | null }) => boolean;

  /**
   * export as `structuredData` (if true) or specified variable name.
   *
   * @default true
   */
  exportAs?: string | boolean;
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

/**
 * Extract content into structured data, as Markdown sliced from the authored source. Links and JSX elements are
 * replaced by their content, images are removed.
 *
 * For a content source that renders pages for props, the export is a function of the props giving the records that
 * show. `ctx.data.structuredData` is static: authored expressions as their source, the content of every branch.
 */
export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  filterElement,
  exportAs = true,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const visitors = [...(typeof types === 'function' ? RECORD_VISITORS : types), ...EDIT_VISITORS];

  const plugin: ExtraPluginHooks & { (): MdastPluginDefinition } = () => {
    let records: ReturnType<typeof createStructuredRecords<Nodes>>;
    let isStatic = false;
    /** the code of the ESM nodes */
    const esm: string[] = [];
    const visit = (node: Nodes, ctx: MdastVisitorContext) =>
      records.collect(node, () => showConditions(node, ctx));

    return {
      name: 'remark-structure',
      // positions tell authored nodes from generated ones
      options: { position: true },
      before(_root: unknown, ctx: MdastVisitorContext) {
        isStatic = isStaticOutput(ctx.data);
        const out = createCodeOutput(ctx, {
          target: 'search',
          isStatic,
          keep: filterElement as ((node: unknown) => boolean) | undefined,
        });
        records = createStructuredRecords<Nodes>(out, {
          isType: matchType,
          mdxTypes,
          tableRow: tableRowToStructuredData,
          headingIds: ctx.data._headingIds,
        });

        // Fumadocs OpenAPI Generated Structured Data
        const openapi = (ctx.data.frontmatter as { _openapi?: { structuredData?: StructuredData } })
          ?._openapi?.structuredData;
        for (const item of openapi?.headings ?? []) records.push(item);
        for (const item of openapi?.contents ?? []) records.push(item);
      },
      after(_root, ctx) {
        ctx.data.structuredData ??= records.toStatic();
        if (exportAs && !isStatic) ctx.data._structuredDataCode = records.toCode(esmScope(esm));
      },
      mdxjsEsm(node, ctx) {
        visit(node as Nodes, ctx);
        esm.push(node.value);
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
