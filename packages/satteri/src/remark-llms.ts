import { defineMdastPlugin } from 'satteri';
import type { MdastNode, MdastVisitorContext } from 'satteri';
import type { Parents, Root } from 'mdast';
import { gfmToMarkdown } from 'mdast-util-gfm';
import type { LLMsOptions } from 'fumadocs-core/mdx-plugins/remark-llms';
import { defaultStringifier } from 'fumadocs-core/mdx-plugins/stringifier';

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

const ROOT_VISITOR_TYPES = new Set<string>(ROOT_VISITORS);

function isRootChild(node: MdastNode, ctx: MdastVisitorContext) {
  return ctx.parent(node)?.type === 'root';
}

function countRootTargets(parent: Parents) {
  let count = 0;
  for (const child of parent.children) {
    if (ROOT_VISITOR_TYPES.has(child.type)) count++;
  }
  return count;
}

export function remarkLlms({ as = '_markdown', headingIds = true, ...rest }: LLMsOptions = {}) {
  return () => {
    let rootParent: Parents | undefined;
    const rootIndices: number[] = [];
    let expected = 0;

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

    function finalize(ctx: MdastVisitorContext) {
      const parent = rootParent!;
      const children = rootIndices.map((index) => structuredClone(parent.children[index]!));
      const tree = { type: 'root', children } as Root;
      ctx.data[as] = stringifier.call(undefined as never, tree, undefined);
    }

    function track(node: MdastNode, ctx: MdastVisitorContext) {
      if (!isRootChild(node, ctx)) return;

      const parent = ctx.parent(node)!;
      rootParent ??= parent;

      if (!expected) {
        expected = countRootTargets(parent);
        if (!expected) {
          ctx.data[as] = '';
          return;
        }
      }

      rootIndices.push(ctx.indexOf(node)!);

      if (rootIndices.length === expected) finalize(ctx);
    }

    return defineMdastPlugin({
      name: 'remark-llms',
      ...Object.fromEntries(ROOT_VISITORS.map((key) => [key, track])),
    });
  };
}
