import { jsx, toJs } from 'estree-util-to-js';
import type { Element, Nodes, Root, RootContent } from 'hast';
import { defaultHandlers, type Handle, toEstree } from 'hast-util-to-estree';
import { defineHastPlugin, type MdastNode, type MdastVisitorContext } from 'satteri';
import type { Program } from 'estree-jsx';
import { parse as parseCode } from 'yuku-parser';
import type {
  rehypeCodeFromHighlighter,
  RehypeCodeFromHighlighterOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code.core';
import { showElement } from 'fumadocs-core/mdx-plugins/remark-show';
import { createStringifier, offsets, type PositionedNode, type Stringifier } from './stringifier';

export interface JsxElementNode {
  name?: string | null;
  attributes: (
    | { type: 'mdxJsxAttribute'; name: string; value?: string | { value: string } | null }
    | { type: 'mdxJsxExpressionAttribute'; value: string }
  )[];
}

/**
 * Flatten a node's text content by walking it in JavaScript.
 *
 * Prefer `ctx.textContent(node, { includeImageAlt: false })` for nodes of the
 * visited document — it walks the tree in Rust without materializing the
 * subtree. This util is for detached trees (e.g. `mdxToMdast()` output), which
 * have no handle behind them and can't use the visitor context.
 */
export function flattenNode(node: MdastNode): string {
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map((child) => flattenNode(child)).join('');
  }

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
}

export function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag);
  if (idx !== -1) {
    return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length);
  }

  return false;
}

type JsxElement = Parameters<typeof defaultHandlers.mdxJsxFlowElement>[0];

/** Sätteri's MDX expressions have no estree, elements using them are skipped */
const element: Handle = (node: JsxElement, state) => {
  for (const attr of node.attributes) {
    const value = attr.type === 'mdxJsxAttribute' ? attr.value : attr;
    if (typeof value === 'object' && value && !value.data?.estree) return;
  }
  return defaultHandlers.mdxJsxFlowElement(node, state);
};

/** Sätteri's MDX expressions have no estree, parsed from their code */
const expression: Handle = (node: { type: 'mdxTextExpression'; value: string }, state) =>
  defaultHandlers.mdxTextExpression({ ...node, data: { estree: parse(node.value) } }, state);

/** raw HTML of Markdown is kept as text */
const raw: Handle = (node: { value: string }, state) =>
  defaultHandlers.text({ type: 'text', value: node.value }, state);

export function jsxToSource(hast: Nodes): string {
  const estree = toEstree(hast, {
    elementAttributeNameCase: 'react',
    handlers: {
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      mdxTextExpression: expression,
      raw,
    },
  });
  const source = toJs(estree, { handlers: jsx }).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
}

export function parse(code: string): Program {
  return parseCode(code, { lang: 'jsx', preserveParens: false }).program as Program;
}

/** a part of an output that renders from code */
type CodePart =
  /** a value, like an authored expression, `fallback` in outputs that can't render it */
  | { code: string; fallback: string }
  /** content shown when `when` holds, a branch of `<show>` checked when rendering */
  | { when: string }
  | KeptElement;

/** a kept JSX element */
interface KeptElement {
  /** the opening tag without its end, with the name prefixed */
  open: string;
  name: string;
  inline: boolean;
}

/** Markdown and the parts of it rendered from code, the content of branches and elements as chunks */
export type Chunk =
  | string
  | Extract<CodePart, { code: string }>
  | (Exclude<CodePart, { code: string }> & { children: Chunk[] });

type CodeNode = PositionedNode & {
  type: string;
  name?: unknown;
  attributes?: unknown;
  value?: unknown;
  children?: readonly PositionedNode[];
};

const markerRegex = /\0(\/?)(\d+)\0/g;

/** the text a literal renders, booleans and `null` render nothing */
function literalText(expression: { type: string; value?: unknown }): string | undefined {
  if (expression.type !== 'Literal') return;
  const { value } = expression;
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'boolean' || value === null) return '';
}

/**
 * A stringifier whose output can have parts rendered from code: replacements mark them, `chunks()` splits the output on
 * their markers. Authored expressions and the branches of `<show>` checked when rendering read render scope (`props`),
 * an output with them is a function of the props.
 */
export function createCodeOutput(ctx: MdastVisitorContext, namespace?: 'search') {
  const parts: CodePart[] = [];
  let dynamic = false;
  /** a value */
  const mark = (part: CodePart) => `\0${parts.push(part) - 1}\0`;
  /** content, it stays in the output so edits apply to it like to other content (e.g. the prefixes of lists) */
  const wrap = (part: CodePart, content: string) => {
    const i = parts.push(part) - 1;
    return `\0${i}\0${content}\0/${i}\0`;
  };
  const s: Stringifier = createStringifier(ctx, namespace, (code, fallback) =>
    mark({ code, fallback }),
  );

  /** the output without code: expressions as their fallbacks, branches unwrapped */
  function toStatic(text: string): string {
    return text.replace(markerRegex, (_, close: string, i: string) => {
      const part = parts[Number(i)];
      return !close && 'fallback' in part ? part.fallback : '';
    });
  }

  function chunks(text: string): Chunk[] {
    const root: Chunk[] = [];
    const stack: Chunk[][] = [root];
    /** a branch just closed, the whitespace after it goes with it */
    let branch: Chunk[] | undefined;
    let idx = 0;
    const pushText = (end: number) => {
      let value = text.slice(idx, end);
      if (branch) {
        const lead = /^\s*/.exec(value)![0];
        if (lead.includes('\n')) {
          branch.push(lead);
          value = value.slice(lead.length);
        }
        branch = undefined;
      }
      if (value) stack.at(-1)!.push(value);
    };

    for (const match of text.matchAll(markerRegex)) {
      pushText(match.index);
      idx = match.index + match[0].length;
      const part = parts[Number(match[2])];
      if (match[1]) {
        const children = stack.pop()!;
        stack.at(-1)!.push({ ...part, children } as Chunk);
        if ('when' in part) branch = children;
      } else if ('code' in part) {
        stack.at(-1)!.push(part);
      } else {
        stack.push([]);
      }
    }
    pushText(text.length);
    return root;
  }

  return {
    s,
    mark,
    wrap,
    chunks,
    toStatic,
    /** whether a marked part reads render scope */
    get dynamic() {
      return dynamic;
    },
    /**
     * Mark a node rendered from code: an authored expression, or a branch of `<show>` checked when rendering.
     *
     * @returns whether it is one
     */
    markCode(node: CodeNode): boolean {
      if (node.type === 'mdxTextExpression' || node.type === 'mdxFlowExpression') {
        const code = node.value as string;
        const statement = parse(code).body[0];
        const expression =
          statement?.type === 'ExpressionStatement' ? statement.expression : undefined;
        // a comment renders nothing, a literal like `{' '}` is text
        const text = expression ? literalText(expression) : '';
        if (text !== undefined) {
          s.replace(node, text);
          return true;
        }
        dynamic = true;
        const range = offsets(node);
        const fallback = range ? s.source.slice(range.start, range.end) : '';
        s.replace(node, mark({ code, fallback }));
        return true;
      }

      const when = showCondition(node);
      if (!when) return false;
      dynamic = true;
      s.replace(node, (s) => wrap({ when }, s.inner(node)));
      return true;
    },
  };
}

/** the condition of a branch of `<show>` checked when rendering */
export function showCondition(node: {
  type: string;
  name?: unknown;
  attributes?: unknown;
}): string | undefined {
  if (node.name !== showElement) return;
  for (const attr of node.attributes as JsxElementNode['attributes'])
    if (attr.type === 'mdxJsxAttribute' && attr.name === 'when' && typeof attr.value === 'object')
      return attr.value?.value;
}

/** the conditions of the branches of `<show>` around a node, outermost first */
export function showConditions(
  node: object,
  ctx: { parent: (node: never) => object | undefined },
): string[] {
  const out: string[] = [];
  for (let p = ctx.parent(node as never); p; p = ctx.parent(p as never)) {
    const condition = showCondition(p as { type: string });
    if (condition) out.unshift(condition);
  }
  return out;
}

/** all of the conditions */
export function and(conditions: string[]): string | undefined {
  if (conditions.length > 0) return `(${conditions.join(') && (')})`;
}

/** an array of items, each kept only when its conditions hold */
export function guardedArray(items: { code: string; when: string[] }[]): string {
  let out = '[';
  for (const { code, when } of items) {
    const test = and(when);
    out += test ? `...(${test} ? [${code}] : []),` : `${code},`;
  }
  return `${out}]`;
}

/** the chunks as one value: a string without parts, a fragment otherwise */
export function chunksToCode(chunks: Chunk[]): string {
  let text = '';
  for (const chunk of chunks) {
    if (typeof chunk !== 'string') return `<>${chunksToJsx(chunks)}</>`;
    text += chunk;
  }
  return JSON.stringify(text);
}

function chunksToJsx(chunks: Chunk[]): string {
  let out = '';
  for (const chunk of chunks) {
    if (typeof chunk === 'string') out += `{${JSON.stringify(chunk)}}`;
    else if ('code' in chunk) out += `{${chunk.code}}`;
    else if ('when' in chunk)
      out += `{(${chunk.when}) ? <>${chunksToJsx(chunk.children)}</> : null}`;
    else {
      const { open, name, inline, children } = chunk;
      const element =
        children.length > 0 ? `${open}>${chunksToJsx(children)}</_c.${name}>` : `${open} />`;
      // keep inline elements in inline context when rendered
      out += inline ? `<span>${element}</span>` : element;
    }
  }
  return out;
}

// Shiki writes literal HTML attribute names into hast `properties`. The
// classic pipeline normalizes them via hast-util-to-estree, but satteri emits
// property keys verbatim, so React would receive `class`/`tabindex` props and
// render them over the component's own `className` (hydration mismatch).
const ATTRIBUTE_TO_PROP = Object.entries({
  class: 'className',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  contenteditable: 'contentEditable',
});

function normalizeProperties(node: RootContent | Root) {
  if (node.type === 'element' && node.properties) {
    for (const [attribute, prop] of ATTRIBUTE_TO_PROP) {
      if (attribute in node.properties) {
        node.properties[prop] ??= node.properties[attribute];
        delete node.properties[attribute];
      }
    }
  }

  if ('children' in node) {
    for (const child of node.children) normalizeProperties(child);
  }
}

function elementClasses(element: Element): string[] {
  const className = element.properties.className as string[] | string;
  if (Array.isArray(className)) return className.map(String);
  if (typeof className === 'string') return className.split(/\s+/);
  return [];
}

const skipClasses = new Set(['shiki', 'language-math', 'math-inline', 'math-display']);

function shouldSkipHighlight(element: Element) {
  const classes = elementClasses(element);
  if (classes.some((c) => skipClasses.has(c))) return true;

  if (element.tagName === 'pre') {
    for (const child of element.children) {
      if (child.type === 'element' && shouldSkipHighlight(child)) return true;
    }
  }

  return false;
}

/** run the transformer of a rehype code plugin on each code block */
export function highlightPlugin(
  name: string,
  transformer: ReturnType<typeof rehypeCodeFromHighlighter>,
  inline: RehypeCodeFromHighlighterOptions['inline'],
) {
  return defineHastPlugin({
    name,
    element: {
      // every matched node crosses into JS, inline code only matches when it is highlighted
      filter: inline ? ['pre', 'code'] : ['pre'],
      async visit(element, ctx) {
        if (shouldSkipHighlight(element)) return;

        // `code` inside `pre` is handled by the `pre` visit; highlighting it
        // separately queues transforms on a replaced node, which get dropped
        if (element.tagName === 'code') {
          const parent = ctx.parent(element);
          if (parent?.type === 'element' && parent.tagName === 'pre') return;
        }

        const tree: Root = { type: 'root', children: [element] };
        await transformer(tree, null as never, () => undefined);
        const next = tree.children[0] as RootContent | Root;
        // not highlighted, replacing it with itself still costs a re-encode in Sätteri
        if (next === element) return;
        normalizeProperties(next);
        if (next.type !== 'root') ctx.replaceNode(element, next);
        else if (next.children.length > 0) ctx.replaceNode(element, next.children);
      },
    },
  });
}
