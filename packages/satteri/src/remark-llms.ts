import type { MdastPluginInput } from 'satteri';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { LLMsOptions as RawLLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { defaultStringifier } from 'fumadocs-core/mdx-plugins/stringifier';
import type { ExtraPluginHooks } from './compile';

export type LLMsOptions = Omit<RawLLMsOptions, '_data'>;

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

  const plugin: MdastPluginInput & ExtraPluginHooks = {
    name: 'remark-llms',
    before(root, ctx) {
      ctx.data.markdown ??= stringifier.call(undefined as never, root, undefined);
    },
    collectExports({ data, addExport }) {
      if (as) {
        addExport(as, JSON.stringify(data.markdown ?? ''));
      }
    },
  };
  return plugin;
}
