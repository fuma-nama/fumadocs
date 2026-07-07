import { defineMdastPlugin } from 'satteri';
import type { MdastNode, MdastPluginInput, MdastVisitorContext } from 'satteri';
import type { Parents } from 'mdast';
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

  const plugin: MdastPluginInput & ExtraPluginHooks = () => {
    let rootParent: Parents | undefined;
    const rootIndices: number[] = [];
    let expected = 0;

    function finalize(ctx: MdastVisitorContext) {
      const parent = rootParent!;
      const children = rootIndices.map((index) => structuredClone(parent.children[index]!));
      ctx.data.markdown = stringifier.call(
        undefined as never,
        { type: 'root', children },
        undefined,
      );
    }

    function track(node: MdastNode, ctx: MdastVisitorContext) {
      if (!isRootChild(node, ctx)) return;

      const parent = ctx.parent(node)!;
      rootParent ??= parent;

      if (expected === 0) expected = countRootTargets(parent);
      if (expected === 0) return;

      rootIndices.push(ctx.indexOf(node)!);

      if (rootIndices.length === expected) finalize(ctx);
    }

    return defineMdastPlugin({
      name: 'remark-llms',
      ...Object.fromEntries(ROOT_VISITORS.map((key) => [key, track])),
    });
  };
  plugin.afterToJs = ({ result }) => {
    if (as) {
      const markdown = (result.data.markdown ??= '');
      result.code += `\nexport const ${as} = ${JSON.stringify(markdown)};`;
    }
  };
  return plugin;
}
