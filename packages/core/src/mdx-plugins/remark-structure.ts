import type { Link, Nodes, Root } from 'mdast';
import { remark } from 'remark';
import remarkGfm from 'remark-gfm';
import type { PluggableList, Processor, Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { flattenNode, toMdxExport } from './mdast-utils';
import type {
  MdxJsxAttribute,
  MdxJsxExpressionAttribute,
  MdxJsxFlowElement,
  MdxJsxTextElement,
} from 'mdast-util-mdx';
import { type Handle, type Options, toMarkdown } from 'mdast-util-to-markdown';
import { remarkHeading } from './remark-heading';

interface StructuredDataHeading {
  id: string;
  content: string;
}

interface StructuredDataContent {
  heading: string | undefined;
  content: string;
}

export interface StructuredData {
  headings: StructuredDataHeading[];
  /**
   * Refer to paragraphs, a heading may contain multiple contents as well
   */
  contents: StructuredDataContent[];
}

type Stringifier = (this: Processor, node: Nodes, ctx: StringifierContext) => string;

interface StringifierContext {
  addContent: (...content: StructuredDataContent[]) => void;
}

interface StringifyOptions {
  /**
   * Filter the elements to be included in the output:
   *
   * - `true`: include element & its children.
   * - `children-only`: exclude element but keep its children.
   * - `false`: exclude element & its children.
   */
  filterElement?: (node: Nodes) => boolean | 'children-only';

  /**
   * Filter the attributes to stringify.
   */
  filterMdxAttributes?: (
    node: MdxJsxFlowElement | MdxJsxTextElement,
    attribute: MdxJsxAttribute | MdxJsxExpressionAttribute,
  ) => boolean;
}

export interface StructureOptions {
  /**
   * MDAST node types to be scanned as a content block.
   *
   * If a node's type represents in this array, it will be converted into a single content block.
   *
   * @defaultValue ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement']
   */
  types?: string[] | ((node: Nodes) => boolean);

  /**
   * stringify a given node & its children, you can use something like `mdast-util-to-markdown`.
   */
  stringify?: Stringifier | StringifyOptions;

  /**
   * Whether the MDX element should be treated as a single content block, only effective if `types` has `mdxJsxFlowElement`.
   *
   * Default: return `true` if the element is a leaf node, otherwise `false`.
   */
  mdxTypes?: (node: MdxJsxFlowElement | MdxJsxTextElement) => boolean;

  /** @deprecated use `stringify.filterMdxAttributes` instead */
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
     * [Fumadocs: remark-structure] The stringified form of node for generating search index.
     */
    _string?: string | (() => string);

    /**
     * [Fumadocs: remark-structure] Items to add to the structured data.
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
  types: ['heading', 'paragraph', 'blockquote', 'tableCell', 'mdxJsxFlowElement'],
  mdxTypes(node) {
    return node.children.length === 0;
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
    mdxTypes = remarkStructureDefaultOptions.mdxTypes,
    stringify: stringifyOptions,
    allowedMdxAttributes,
    exportAs = remarkStructureDefaultOptions.exportAs,
  }: StructureOptions = {},
): Transformer<Root, Root> {
  if (Array.isArray(types)) {
    const arr = types;
    types = (node) => arr.includes(node.type);
  }

  const stringify =
    typeof stringifyOptions === 'function'
      ? stringifyOptions
      : defaultStringify({
          filterMdxAttributes: Array.isArray(allowedMdxAttributes)
            ? (_node, attribute) =>
                attribute.type === 'mdxJsxAttribute' &&
                allowedMdxAttributes.includes(attribute.name)
            : allowedMdxAttributes,
          ...stringifyOptions,
        });
  return (tree, file) => {
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

    const stringifierCtx: StringifierContext = {
      addContent(...content) {
        for (const item of content) {
          data.contents.push({ ...item, heading: item.heading ?? lastHeading });
        }
      },
    };

    visit(tree, (element) => {
      if (!types(element)) return;
      switch (element.type) {
        case 'root':
          return;
        case 'mdxJsxFlowElement':
        case 'mdxJsxTextElement':
          if (!mdxTypes(element)) return;
          break;
      }

      if (element.type === 'heading') {
        element.data ||= {};
        element.data.hProperties ||= {};
        const id = element.data.hProperties.id;
        if (typeof id !== 'string') {
          console.warn(
            '[remark-structure] hProperties.id is missing in heading node, it is required to generate heading data. You can add remark-heading prior to remark-structure to generate heading IDs.',
          );
          return 'skip';
        }

        data.headings.push({
          id,
          content: flattenNode(element).trim(),
        });

        lastHeading = id;
        return 'skip';
      }

      const content = stringify.call(this, element, stringifierCtx).trim();
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
    .use(remarkHeading)
    .use(remarkStructure, options)
    .processSync(content);

  return result.data.structuredData!;
}

interface CustomRootNode {
  type: '_custom';
  root: Nodes;
  ctx: StringifierContext;
}

export function defaultStringify(config: Options & StringifyOptions = {}): Stringifier {
  const {
    filterMdxAttributes,
    filterElement = (node) => {
      switch (node.type) {
        case 'mdxJsxFlowElement':
        case 'mdxJsxTextElement':
          switch (node.name) {
            case 'File':
            case 'TypeTable':
            case 'Callout':
            case 'Card':
              return true;
          }
          return 'children-only';
      }

      return true;
    },
  } = config;

  function modHandler(handler: Handle, ctx: StringifierContext): Handle {
    return function (node: Nodes, parent, state, info) {
      const { structuredData, _string } = node.data ?? {};
      if (structuredData) ctx.addContent(...structuredData.contents);
      if (_string) return typeof _string === 'function' ? _string() : _string;
      const visibility = filterElement ? filterElement(node) : true;

      if (visibility === false) return '';

      switch (node.type) {
        case 'mdxJsxFlowElement':
        case 'mdxJsxTextElement': {
          if (visibility === 'children-only') {
            return node.type === 'mdxJsxTextElement'
              ? state.containerPhrasing(node, info)
              : state.containerFlow(node, info);
          }

          const stringifiedAttributes: MdxJsxAttribute[] = [];
          for (const attr of node.attributes) {
            if (attr.type === 'mdxJsxExpressionAttribute') continue;
            if (filterMdxAttributes && !filterMdxAttributes(node, attr)) continue;
            const str = typeof attr.value === 'string' ? attr.value : attr.value?.value;
            if (!str) continue;

            stringifiedAttributes.push({
              ...attr,
              value: str,
            });
          }

          const temp = node.attributes;
          node.attributes = stringifiedAttributes;
          const s = handler(node, parent, state, info);
          node.attributes = temp;
          return s;
        }
        default:
          if (visibility === 'children-only')
            return 'children' in node
              ? state.containerFlow({ type: 'root', children: node.children }, info)
              : '';

          return handler(node, parent, state, info);
      }
    };
  }

  const handlers: Record<string, Handle> = {
    link(node: Link, _, state, info) {
      return state.containerPhrasing(node, info);
    },
    image() {
      return '';
    },
    _custom(node: CustomRootNode, _, state, info) {
      const handlers: Record<string, Handle> = state.handlers;
      for (const k in handlers) {
        handlers[k] = modHandler(handlers[k], node.ctx);
      }

      return state.handle(node.root, undefined, state, info);
    },
    ...config.handlers,
  };

  return function (root, ctx) {
    // from https://github.com/remarkjs/remark/blob/main/packages/remark-stringify/lib/index.js
    const defaultExtensions = this.data('toMarkdownExtensions') ?? [];

    return toMarkdown({ type: '_custom', root, ctx } as never, {
      ...this.data('settings'),
      ...config,
      extensions: config.extensions
        ? [...defaultExtensions, ...config.extensions]
        : defaultExtensions,
      handlers,
    });
  };
}
