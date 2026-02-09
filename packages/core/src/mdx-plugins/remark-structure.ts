import Slugger from 'github-slugger';
import type { Nodes, Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { flattenNode, toMdxExport } from './mdast-utils';
import {
  mdxToMarkdown,
  type MdxJsxAttribute,
  type MdxJsxExpressionAttribute,
  type MdxJsxFlowElement,
  type MdxJsxTextElement,
} from 'mdast-util-mdx';
import { type Handle, toMarkdown } from 'mdast-util-to-markdown';

interface Heading {
  id: string;
  content: string;
}

interface Content {
  heading: string | undefined;
  content: string;
}

export interface StructuredData {
  headings: Heading[];
  /**
   * Refer to paragraphs, a heading may contain multiple contents as well
   */
  contents: Content[];
}

export interface StructureOptions {
  /**
   * MDAST **block** types to be scanned as content.
   *
   * If a node's type is represented in this array, it will be stringified and its children will not be scanned.
   *
   * @defaultValue ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement']
   */
  types?: string[] | ((node: Nodes) => boolean);

  /**
   * stringify a given node & its children, you can use something like `mdast-util-to-markdown`.
   */
  stringify?: (this: Processor, node: Nodes) => string;

  /**
   * By default, it will not index MDX attributes. You can define a list of MDX attributes to index, either:
   *
   * - an array of attribute names.
   * - a function that determines if attribute should be indexed.
   */
  allowedMdxAttributes?:
    | string[]
    | ((
        node: MdxJsxFlowElement | MdxJsxTextElement,
        attribute: MdxJsxAttribute | MdxJsxExpressionAttribute,
      ) => boolean);

  /**
   * export as `structuredData` (if true) or specified variable name.
   */
  exportAs?: string | boolean;
}

declare module 'mdast' {
  interface Data {
    /**
     * [Fumadocs] Stringified form of node, `remarkStructure` uses it to generate search index.
     */
    _string?: string[];
  }
}

declare module 'vfile' {
  interface DataMap {
    /**
     * [Fumadocs] injected by `remarkStructure`
     */
    structuredData: StructuredData;
  }
}

export const remarkStructureDefaultOptions = {
  types: ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  allowedMdxAttributes(node) {
    switch (node.name) {
      case 'TypeTable':
      case 'Callout':
        return true;
      default:
        return false;
    }
  },
  exportAs: false,
} satisfies StructureOptions;

/**
 * Extract content into structured data.
 *
 * By default, the output is stored into VFile (`vfile.data.structuredData`), you can specify `exportAs` to export it.
 */
export function remarkStructure(
  this: Processor,
  {
    types = remarkStructureDefaultOptions.types,
    stringify,
    allowedMdxAttributes = remarkStructureDefaultOptions.allowedMdxAttributes,
    exportAs = remarkStructureDefaultOptions.exportAs,
  }: StructureOptions = {},
): Transformer<Root, Root> {
  const slugger = new Slugger();

  if (Array.isArray(allowedMdxAttributes)) {
    const arr = allowedMdxAttributes;
    allowedMdxAttributes = (_node, attribute) =>
      attribute.type === 'mdxJsxAttribute' && arr.includes(attribute.name);
  }

  if (Array.isArray(types)) {
    const arr = types;
    types = (node) => arr.includes(node.type);
  }

  stringify ??= (root) => {
    const { mdxJsxFlowElement } = mdxToMarkdown({ tightSelfClosing: true }).extensions![1]
      .handlers!;
    const wrapper: Handle = (node: MdxJsxFlowElement | MdxJsxTextElement, ...rest) => {
      const originalAttributes = node.attributes;
      if (allowedMdxAttributes)
        node.attributes = node.attributes.filter((attr) => allowedMdxAttributes(node, attr));
      const s = mdxJsxFlowElement!(node, ...rest);
      node.attributes = originalAttributes;
      return s;
    };

    return toMarkdown(root, {
      ...this.data('settings'),
      // from https://github.com/remarkjs/remark/blob/main/packages/remark-stringify/lib/index.js
      extensions: this.data('toMarkdownExtensions') ?? [],
      handlers: {
        mdxJsxFlowElement: wrapper,
        mdxJsxTextElement: wrapper,
      },
    });
  };

  return (tree, file) => {
    slugger.reset();
    const data: StructuredData = { contents: [], headings: [] };
    let lastHeading: string | undefined;

    // Fumadocs OpenAPI Generated Structured Data
    if (file.data.frontmatter) {
      const frontmatter = file.data.frontmatter as {
        _openapi?: {
          structuredData?: StructuredData;
        };
      };

      if (frontmatter._openapi?.structuredData) {
        data.headings.push(...frontmatter._openapi.structuredData.headings);
        data.contents.push(...frontmatter._openapi.structuredData.contents);
      }
    }

    visit(tree, (element) => {
      if (element.type === 'root' || !types(element)) return;

      if (element.type === 'heading') {
        element.data ||= {};
        element.data.hProperties ||= {};
        const properties = element.data.hProperties;
        const content = flattenNode(element).trim();
        const id = properties.id ?? slugger.slug(content);

        data.headings.push({
          id,
          content,
        });

        lastHeading = id;
        return 'skip';
      }

      if (element.data?._string) {
        for (const content of element.data._string) {
          data.contents.push({
            heading: lastHeading,
            content,
          });
        }

        return 'skip';
      }

      const content = stringify.call(this, element).trim();
      if (content.length > 0) {
        data.contents.push({
          heading: lastHeading,
          content,
        });
      }

      return 'skip';
    });

    file.data.structuredData = data;
    if (exportAs) {
      tree.children.unshift(
        toMdxExport(typeof exportAs === 'string' ? exportAs : 'structuredData', data),
      );
    }
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
  const result = remark()
    .use(remarkGfm)
    .use(remarkPlugins)
    .use(remarkStructure, options)
    .processSync(content);

  return result.data.structuredData!;
}
