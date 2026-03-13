import type { Nodes } from 'mdast';
import {
  type MdxJsxFlowElement,
  type MdxJsxTextElement,
  type MdxJsxAttribute,
  type MdxJsxExpressionAttribute,
  mdxToMarkdown,
} from 'mdast-util-mdx';
import { type Handle, type Options, toMarkdown } from 'mdast-util-to-markdown';
import type { Processor } from 'unified';

declare module 'mdast' {
  interface Data {
    /**
     * [Fumadocs: stringify] The stringified form of node, used for generating search index, `llms.txt`, etc.
     */
    _string?: string | (() => string);
  }
}

export type Stringifier<Context> =
  | ((this: Processor, node: Nodes, ctx: Context) => string)
  | ((node: Nodes, ctx: Context) => string);

export interface StringifyOptions<Context = undefined> extends Options {
  /**
   * Filter the elements to be included in the output:
   *
   * - `true`: include element & its children.
   * - `children-only`: exclude element but keep its children.
   * - `false`: exclude element & its children.
   *
   * Default:
   *
   * ```ts
   * filterElement = (node) => {
   *   switch (node.type) {
   *     case 'mdxJsxFlowElement':
   *     case 'mdxJsxTextElement':
   *       switch (node.name) {
   *         case 'File':
   *         case 'TypeTable':
   *         case 'Callout':
   *         case 'Card':
   *           return true;
   *       }
   *       return 'children-only';
   *   }
   *
   *   return true;
   * },
   * ```
   */
  filterElement?: (node: Nodes) => boolean | 'children-only';

  /**
   * Filter the attributes to stringify.
   */
  filterMdxAttributes?: (
    node: MdxJsxFlowElement | MdxJsxTextElement,
    attribute: MdxJsxAttribute | MdxJsxExpressionAttribute,
  ) => boolean;

  onStringify?: (node: Nodes, ctx: Context) => void;
}

interface CustomRootNode<Context> {
  type: '_custom';
  root: Nodes;
  ctx: Context;
}

export function defaultStringifier<Context>(
  config: StringifyOptions<Context> = {},
): Stringifier<Context> {
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
    onStringify,
    ...customExtension
  } = config;

  function modHandler(handler: Handle, ctx: Context): Handle {
    return function (node: Nodes, parent, state, info) {
      if (onStringify) onStringify(node, ctx);
      if (node.data?._string)
        return typeof node.data._string === 'function' ? node.data._string() : node.data._string;
      const visibility = filterElement(node);

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

  const customToMarkdown: Options = {
    handlers: {
      _custom(node: CustomRootNode<Context>, _, state, info) {
        const handlers: Record<string, Handle> = state.handlers;
        for (const k in handlers) {
          handlers[k] = modHandler(handlers[k], node.ctx);
        }

        return state.handle(node.root, undefined, state, info);
      },
    } as Record<string, Handle>,
  };

  return function (this: Processor | undefined, root, ctx) {
    return toMarkdown({ type: '_custom', root, ctx } satisfies CustomRootNode<Context> as never, {
      ...this?.data('settings'),
      extensions: [
        mdxToMarkdown(),
        ...(this?.data('toMarkdownExtensions') ?? []),
        customToMarkdown,
        customExtension,
      ],
    });
  };
}
