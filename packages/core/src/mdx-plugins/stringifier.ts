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
     * [Fumadocs: stringify] Extra info for stringifying the node:
     * - `children-only`: only stringify its children.
     * - `{ node }`: stringify as another node.
     * - `{ text }`: the stringified form of node.
     */
    _stringify?: 'children-only' | { node: Nodes } | { text: string };
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

  /**
   * run before stringifying any nodes
   */
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
      let visibility = filterElement(node);
      if (visibility === false) return '';

      if (onStringify) onStringify(node, ctx);

      const extraInfo = node.data?._stringify;
      if (extraInfo) {
        if (extraInfo === 'children-only') {
          visibility = 'children-only';
        } else if ('text' in extraInfo) {
          return extraInfo.text;
        } else {
          node = extraInfo.node;
        }
      }

      if (visibility === 'children-only') {
        if (!('children' in node)) return '';

        switch (node.type) {
          case 'mdxJsxTextElement':
          case 'paragraph':
            return state.containerPhrasing(node, info);
          case 'mdxJsxFlowElement':
            return state.containerFlow(node, info);
          default:
            return state.containerFlow({ type: 'root', children: node.children }, info);
        }
      }

      switch (node.type) {
        case 'mdxJsxFlowElement':
        case 'mdxJsxTextElement': {
          const stringifiedAttributes: MdxJsxAttribute[] = [];
          for (const attr of node.attributes) {
            if (attr.type === 'mdxJsxExpressionAttribute') continue;
            if (filterMdxAttributes && !filterMdxAttributes(node, attr)) continue;
            const str = typeof attr.value === 'string' ? attr.value : attr.value?.value;
            if (!str) continue;

            stringifiedAttributes.push({
              type: 'mdxJsxAttribute',
              name: attr.name,
              value: str,
            });
          }

          return handler({ ...node, attributes: stringifiedAttributes }, parent, state, info);
        }
        default:
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
