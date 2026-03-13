import type { Processor, Transformer } from 'unified';
import { toMdxExport } from './mdast-utils';
import type { Heading, Root } from 'mdast';
import { defaultStringifier, type StringifyOptions } from './stringifier';

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
}

/**
 * generate `llms.txt` for markdown.
 */
export function remarkLLMs(
  this: Processor,
  { as = '_markdown', headingIds = true, ...stringify }: LLMsOptions = {},
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

  return (node) => {
    node.children.unshift(toMdxExport(as, stringifier.call(this, node, undefined)));
  };
}
