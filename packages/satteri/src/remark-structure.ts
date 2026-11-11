import type { MdastPluginDefinition, MdastVisitorContext } from 'satteri';
import type { Nodes } from 'mdast';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { tableRowToStructuredData } from 'fumadocs-core/search';
import type { ExtraPluginHooks } from './compile';
import { createCodeOutput, esmScope } from './utils';
import type { Stringifier } from './stringifier';
import { showConditions } from '../../shared/show';
import { staticTagRegex } from '../../shared/code-output';
import { createStructuredRecords } from '../../shared/structured-records';

declare module 'satteri' {
  interface DataMap {
    /** the code of the export of structured data */
    _structuredDataCode?: string;
  }
}

export interface StructureOptions {
  types?: string[] | ((node: Nodes) => boolean);
  mdxTypes?: (node: Nodes) => boolean;

  /** see `filterElement` of `remarkStructure()` from `fumadocs-core/mdx-plugins/remark-structure` */
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
 * For a content source that renders pages for props, a document whose records read props (authored expressions,
 * `<show>`, heading IDs from code) exports a function of the props giving the records that show, see
 * `remarkStructure()` of `fumadocs-core/mdx-plugins/remark-structure`. `ctx.data.structuredData` is static.
 */
export function remarkStructure({
  types = ['heading', 'paragraph', 'blockquote', 'table', 'mdxJsxFlowElement'],
  mdxTypes = (node) => !('children' in node) || node.children.length === 0,
  filterElement = (node) => staticTagRegex.test(node.name ?? ''),
  exportAs = true,
}: StructureOptions = {}) {
  const matchType =
    typeof types === 'function' ? types : (node: Nodes) => types.includes(node.type);
  const visitors = [...(typeof types === 'function' ? RECORD_VISITORS : types), ...EDIT_VISITORS];

  const plugin: ExtraPluginHooks & { (): MdastPluginDefinition } = () => {
    let records: ReturnType<typeof createStructuredRecords<Nodes, Stringifier>>;
    /** the code of the ESM nodes */
    const esm: string[] = [];
    const visit = (node: Nodes, ctx: MdastVisitorContext) =>
      records.collect(node, () => showConditions(node, ctx));

    return {
      name: 'remark-structure',
      // positions tell authored nodes from generated ones
      options: { position: true },
      before(_root: unknown, ctx: MdastVisitorContext) {
        const out = createCodeOutput(ctx, {
          target: 'search',
          runtime: ctx.data.unstable_runtimeOutputs === true,
          keep: filterElement as (node: unknown) => boolean,
        });
        records = createStructuredRecords<Nodes, Stringifier>(out, {
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
        const data = (ctx.data.structuredData ??= records.toStatic());
        if (exportAs)
          ctx.data._structuredDataCode = records.toCode(esmScope(esm)) ?? JSON.stringify(data);
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
        data._structuredDataCode!,
      );
    }
  };
  return plugin;
}

export type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
