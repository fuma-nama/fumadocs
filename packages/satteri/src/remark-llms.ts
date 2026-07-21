import type { MdastNode, MdastPluginInput, MdastVisitorContext } from 'satteri';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { LLMsOptions as RawLLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { defaultStringifier } from 'fumadocs-core/mdx-plugins/stringifier';
import type { ExtraPluginHooks } from './compile';
import { isExportAnchor } from './export-anchor';

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
      // the anchor is appended by `compileMdx`, not part of the document
      if (isExportAnchor(node)) return false;

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
    collectExports({ data, addExport }) {
      if (as) {
        addExport(as, JSON.stringify(data.markdown ?? ''));
      }
    },
    afterToJs({ result }) {
      result.data.markdown ??= '';
    },
    ...Object.fromEntries(ROOT_VISITORS.map((key) => [key, track])),
  };
  return plugin;
}
