import type { Processor, Transformer } from 'unified';
import { toMdxExport } from './mdast-utils';
import type { Heading, Parents, Root } from 'mdast';
import { defaultStringifier, type StringifyOptions } from './stringifier';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx';
import type { Info, State } from 'mdast-util-to-markdown';
import type { PlaceholderData } from './remark-llms.runtime';

export interface LLMsOptions extends StringifyOptions {
  /**
   * export name for output Markdown.
   *
   * @default _markdown
   */
  as?: string;

  /**
   * Explicit heading IDs in output.
   *
   * @default true
   */
  headingIds?: boolean;

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
   *     case 'mdxjsEsm':
   *       return false;
   *     default:
   *       return true;
   *   }
   * },
   * ```
   */
  filterElement?: StringifyOptions['filterElement'];

  /**
   * @private output in file data
   */
  _data?: boolean;
}

/**
 * generate `llms.txt` for markdown.
 */
export function remarkLLMs(
  this: Processor,
  { as = '_markdown', headingIds = true, _data = false, ...stringify }: LLMsOptions = {},
): Transformer<Root, Root> {
  const stringifier = defaultStringifier({
    ...stringify,
    filterElement(node) {
      switch (node.type) {
        case 'mdxjsEsm':
          return false;
        default:
          return true;
      }
    },
    handlers: {
      heading(node: Heading, _p, state, info) {
        const id = node.data?.hProperties?.id;
        const content = state.containerPhrasing(node, info);
        return headingIds && id ? `${content} [#${id}]` : content;
      },
      ...stringify.handlers,
    },
  });

  return (node, file) => {
    const value = stringifier.call(this, node, undefined);
    node.children.unshift(toMdxExport(as, value));
    if (_data) file.data.markdown = value;
  };
}

export function placeholder(
  node: MdxJsxTextElement | MdxJsxFlowElement,
  _parent: Parents | undefined,
  state: State,
  info: Info,
) {
  const attributes: Record<string, unknown> = {};
  for (const attr of node.attributes) {
    if (attr.type === 'mdxJsxExpressionAttribute') continue;
    attributes[attr.name] = attr.value;
  }

  return `\0${JSON.stringify({
    name: node.name,
    children: state.containerPhrasing(node, info),
    attributes,
  } satisfies PlaceholderData)}\0`;
}
