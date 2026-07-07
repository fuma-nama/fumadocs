import type { MdastNode, MdastPluginInput, MdastVisitorContext } from 'satteri';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { LLMsOptions as RawLLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { defaultStringifier } from 'fumadocs-core/mdx-plugins/stringifier';
import { ExtraPluginHooks } from './compile';

export type LLMsOptions = Omit<RawLLMsOptions, '_data'>;

const ROOT_VISITORS = [
  'paragraph',
  'heading',
  'thematicBreak',
  'blockquote',
  'list',
  'listItem',
  'html',
  'code',
  'definition',
  'table',
  'tableRow',
  'tableCell',
  'mdxJsxFlowElement',
  'mdxFlowExpression',
  'mdxjsEsm',
  'containerDirective',
  'leafDirective',
  'math',
  'inlineMath',
] as const;

export function remarkLlms({ as = '_markdown', headingIds = true, ...rest }: LLMsOptions = {}) {
  const stringifier = defaultStringifier({
    ...rest,
    ...gfmToMarkdown(),
    filterElement(node) {
      switch (node.type) {
        case 'mdxjsEsm':
          return false;
        default:
          return true;
      }
    },
    handlers: {
      inlineMath(node: { value: string }) {
        return `$${node.value}$`;
      },
      math(node: { value: string }) {
        return `$$\n${node.value}\n$$`;
      },
      heading(node, _parent, state, info) {
        const id = node.data?.hProperties?.id;
        const value = state.containerPhrasing(node, info);
        return headingIds && typeof id === 'string' ? `${value} [#${id}]` : value;
      },
      ...rest.handlers,
    },
    stringify: rest.stringify,
  });

  function track(node: MdastNode, ctx: MdastVisitorContext) {
    if (ctx.data.markdown !== undefined) return;

    const parent = ctx.parent(node);
    if (parent && parent.type === 'root') {
      ctx.data.markdown = stringifier.call(undefined as never, parent, undefined);
    }
  }

  const plugin: MdastPluginInput & ExtraPluginHooks = {
    name: 'remark-llms',
    afterToJs({ result }) {
      if (as) {
        const markdown = (result.data.markdown ??= '');
        result.code += `\nexport const ${as} = ${JSON.stringify(markdown)};`;
      }
    },
    ...Object.fromEntries(ROOT_VISITORS.map((key) => [key, track])),
  };
  return plugin;
}
