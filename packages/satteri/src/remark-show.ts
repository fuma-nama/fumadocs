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
    // a page without branches, build-time values or included files skips the plugin
    const { source } = document;
    if (!source.includes('<show') && !source.includes('<include') && !context.reads(source)) return;
    let used = false;
    /** the content of decided nodes by start offset */
    const decided = new Map<number, readonly MdastNode[]>();
    /** the outermost decided branches with their content, replaced after the pass */
    const branches: [Readonly<Element>, readonly MdastNode[]][] = [];
    const contentOf = (node: Readonly<MdastNode>) =>
      node.type === 'mdxTextExpression' || ('name' in node && node.name === 'show')
        ? decided.get(offsets(node)!.start)
        : undefined;
    /** `nodes` with decided nodes swapped for their content */
    function unwrap(nodes: readonly MdastNode[], out: MdastNode[]): MdastNode[] {
      for (const node of nodes) {
        const content = contentOf(node);
        if (content) unwrap(content, out);
        else out.push(node);
      }
      return out;
    }

    function expression(node: Readonly<MdxTextExpression>, ctx: MdastVisitorContext) {
      if (!context.reads(node.value)) return;
      const statement = parse(node.value).body[0];
      const result =
        statement?.type === 'ExpressionStatement'
          ? context.evaluate(statement.expression)
          : undefined;
      const value = result?.value;
      // booleans, `null` and `undefined` render nothing
      if (!result || (typeof value === 'object' && value !== null)) return;
      const text = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
      const content = text ? [{ type: 'text', value: text } as MdastNode] : [];
      replaceSource(ctx, node, text);
      ctx.replaceNode(node, content);
      // a branch replaced after the pass reads its children before the replacement
      decided.set(offsets(node)!.start, content);
    }

    function element(node: Readonly<Element>, ctx: MdastVisitorContext) {
      if (node.name !== 'show') return;
      const result = context.evaluate(getCondition(node));
      if (!result) {
        used = true;
        return ctx.setProperty<Element, 'name'>(node, 'name', showElement);
      }

      if (!result.value) replaceSource(ctx, node, '');
      else {
        // `inner()` reads the first and last child, copied since Sätteri nodes can't be read after the pass
        const copy = {
          position: node.position,
          data: node.data,
          children: [node.children[0], node.children.at(-1)].map((child) => ({
            position: child?.position,
            data: child?.data,
          })),
        };
        replaceSource(ctx, node, (s) => s.inner(copy));
        // content on the line of the tag is phrasing, it stays in a fragment
        if (
          node.type === 'mdxJsxFlowElement' &&
          node.children[0]?.position?.start.line === node.position?.start.line
        )
          return ctx.setProperty<Element, 'name'>(node, 'name', null);
      }

      // replaced after the pass: Sätteri can't remove a node handed back to `replaceNode`, like a removed branch inside it
      const content = result.value ? node.children : [];
      decided.set(offsets(node)!.start, content);
      const parent = ctx.parent(node);
      // a branch inside another decided branch moves with its content, or is removed with it
      if (contentOf(parent)) return;
      for (let p = ctx.parent(parent); p; p = ctx.parent(p)) if (contentOf(p)?.length === 0) return;
      branches.push([node, content]);
    }

    return {
      name: 'remark-show',
      options: { position: true },
      mdxTextExpression: expression,
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      after(root, ctx) {
        for (const [node, content] of branches) ctx.replaceNode(node, unwrap(content, []));
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
