import type { Nodes, Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Transformer } from 'unified';
import { VFile } from 'vfile';
import { createCodeOutput, esmScope, toMdxExport } from './utils';
import { isStaticOutput, walkBranches } from '../../../shared/show';
import { staticTagRegex } from '../../../shared/code-output';
import { createStructuredRecords } from '../../../shared/structured-records';
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
   * Return `true` to keep a JSX element, other elements are replaced by their content. Kept elements are HTML tags, or
   * render into Markdown like processed Markdown when the export is a function of the props.
   *
   * Default: `File`, `TypeTable`, `Callout` and `Card` elements, or the elements of components when the export is a
   * function of the props.
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
    return staticTagRegex.test(node.name ?? '');
  },
  exportAs: false,
} satisfies StructureOptions;

/**
 * Extract content into structured data, as Markdown sliced from the authored source. Links and JSX elements are
 * replaced by their content, images are removed.
 *
 * For a content source that renders pages for props, the export is a function of the props giving the records that show, their expressions and
 * elements render like in processed Markdown. `vfile.data.structuredData` is static.
 *
 * By default, the output is stored into VFile (`vfile.data.structuredData`), you can specify `exportAs` to export it.
 */
export function remarkStructure({
  types = remarkStructureDefaultOptions.types,
  mdxTypes = remarkStructureDefaultOptions.mdxTypes,
  filterElement,
  exportAs = remarkStructureDefaultOptions.exportAs,
}: StructureOptions = {}): Transformer<Root, Root> {
  const isType = Array.isArray(types) ? (node: Nodes) => types.includes(node.type) : types;

  return (tree, file) => {
    const isStatic = isStaticOutput(file.data);
    const out = createCodeOutput(file, {
      target: 'search',
      isStatic,
      keep: filterElement as ((node: Nodes) => boolean) | undefined,
    });
    const records = createStructuredRecords<Nodes>(out, {
      isType,
      mdxTypes: (node) => mdxTypes(node as JsxElement),
      tableRow: tableRowToStructuredData,
      headingIds: file.data._headingIds,
    });

    // Fumadocs OpenAPI Generated Structured Data
    const openapi = (file.data.frontmatter as { _openapi?: { structuredData?: StructuredData } })
      ?._openapi?.structuredData;
    for (const item of openapi?.headings ?? []) records.push(item);
    for (const item of openapi?.contents ?? []) records.push(item);

    walkBranches<Nodes>(tree, (node, when) => records.collect(node, () => when));

    const data: StructuredData = records.toStatic();
    file.data.structuredData = data;

    if (!exportAs) return;
    const name = typeof exportAs === 'string' ? exportAs : 'structuredData';
    const code = isStatic ? undefined : records.toCode(esmScope(tree));
    tree.children.unshift(
      code ? out.esm(`export const ${name} = ${code};`) : toMdxExport(name, data),
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
