import { defineMdastPlugin } from 'satteri';
import type { MdastNode, MdastVisitorContext } from 'satteri';
import type { Root } from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { defaultStringifier } from 'fumadocs-core/mdx-plugins/stringifier';
import { queueDataExport } from '@/inject-exports';

export type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';

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

function isRootChild(node: MdastNode, ctx: MdastVisitorContext) {
  const parent = ctx.parent(node);
  return parent?.type === 'root';
}

export function remarkLlms({
  as = '_markdown',
  headingIds = true,
  ...rest
}: LLMsOptions = {}) {
  return () => {
    const rootChildren: MdastNode[] = [];
    let ctxRef: MdastVisitorContext | undefined;
    let scheduled = false;

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
      ctxRef = ctx;
      if (isRootChild(node, ctx)) rootChildren.push(structuredClone(node));
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        if (!ctxRef) return;
        const tree = { type: 'root', children: rootChildren } as Root;
        const markdown = stringifier.call(undefined as never, tree, undefined);
        queueDataExport(ctxRef.data, as, markdown);
      });
    }

    return defineMdastPlugin({
      name: 'remark-llms',
      ...Object.fromEntries(ROOT_VISITORS.map((key) => [key, track])),
    });
  };
}
