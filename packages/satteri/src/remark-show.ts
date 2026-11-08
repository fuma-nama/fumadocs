import type {
  MdastNode,
  MdastPluginDefinition,
  MdastVisitorContext,
  MdxJsxFlowElement,
  MdxJsxTextElement,
  MdxTextExpression,
  PluginFactoryContext,
} from 'satteri';
import type { Expression, Program } from 'estree-jsx';
import type { Params } from 'fumadocs-core/source';
import {
  createShowContext,
  showElement,
  type RemarkShowOptions,
} from 'fumadocs-core/mdx-plugins/remark-show';
import { parse as parseCode } from 'yuku-parser';
import { offsets, replaceSource } from '@/stringifier';

export type { RemarkShowOptions };

declare module 'satteri' {
  interface DataMap {
    /** for a page of a dynamic file, its params. Its MDX reads them as props */
    params?: Params;
  }
}

type Element = MdxJsxFlowElement | MdxJsxTextElement;

/** Sätteri port of `remarkShow()` from `fumadocs-core/mdx-plugins/remark-show`, the params of a page are `ctx.data.params` */
export function remarkShow(
  options?: RemarkShowOptions,
): (document: PluginFactoryContext) => MdastPluginDefinition | undefined {
  const createContext = createShowContext(options);

  return (document) => {
    const context = createContext(document.data.params);
    // a page without branches or build-time values skips the plugin
    if (!document.source.includes('<show') && !context.reads(document.source)) return;
    let used = false;
    // the end of the last removed branch, Sätteri still visits its content
    let removedEnd = -1;
    const removed = (node: Readonly<MdastNode>) => (offsets(node)?.start ?? -1) < removedEnd;
    const remove = (node: Readonly<MdastNode>, ctx: MdastVisitorContext) => {
      replaceSource(ctx, node, '');
      ctx.removeNode(node);
      removedEnd = Math.max(removedEnd, offsets(node)?.end ?? -1);
    };

    function expression(node: Readonly<MdxTextExpression>, ctx: MdastVisitorContext) {
      if (!context.reads(node.value) || removed(node)) return;
      const statement = parse(node.value).body[0];
      const result =
        statement?.type === 'ExpressionStatement'
          ? context.evaluate(statement.expression)
          : undefined;
      const value = result?.value;
      if (typeof value === 'string' || typeof value === 'number') {
        replaceSource(ctx, node, String(value));
        ctx.replaceNode(node, { type: 'text', value: String(value) } as MdastNode);
      } else if (result && (value === null || typeof value !== 'object')) {
        // booleans, `null` and `undefined` render nothing
        remove(node, ctx);
      }
    }

    function element(node: Readonly<Element>, ctx: MdastVisitorContext) {
      if (node.name !== 'show' || removed(node)) return;
      const result = context.evaluate(getCondition(node));
      if (result && !result.value) return remove(node, ctx);
      if (result) {
        // a fragment, so the content keeps its structure, its range is read while Sätteri visits it
        const first = node.children[0] && offsets(node.children[0]);
        const last = node.children.at(-1) && offsets(node.children.at(-1)!);
        replaceSource(ctx, node, first && last ? (s) => s.slice(first.start, last.end) : '');
        return ctx.setProperty<Element, 'name'>(node, 'name', null);
      }

      used = true;
      ctx.setProperty<Element, 'name'>(node, 'name', showElement);
    }

    return {
      name: 'remark-show',
      options: { position: true },
      mdxTextExpression: expression,
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        if (used)
          ctx.prependChild(root, { type: 'mdxjsEsm', value: context.declaration } as MdastNode);
      },
    } as MdastPluginDefinition;
  };
}

function parse(code: string): Program {
  return parseCode(code, { lang: 'jsx', preserveParens: false }).program as Program;
}

function getCondition(node: Readonly<Element>): Expression {
  for (const attr of node.attributes) {
    if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'when') continue;
    if (typeof attr.value !== 'object' || !attr.value) break;
    const statement = parse(attr.value.value).body[0];
    if (statement?.type === 'ExpressionStatement') return statement.expression as Expression;
  }

  throw new Error('`<show>` needs a `when` expression, like `when={x === "y"}`');
}
