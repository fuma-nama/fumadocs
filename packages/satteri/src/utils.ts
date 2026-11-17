import { jsx, toJs } from 'estree-util-to-js';
import type { Element, ElementContent, Nodes, Root, RootContent } from 'hast';
import { defaultHandlers, type Handle, toEstree } from 'hast-util-to-estree';
import {
  defineHastPlugin,
  hastToHtml,
  type MdastNode,
  type MdastVisitorContext,
  type MdxJsxTextElementHast,
} from 'satteri';
import type { Program } from 'estree-jsx';
import { parse as parseCode } from 'yuku-parser';
import type {
  rehypeCodeFromHighlighter,
  RehypeCodeFromHighlighterOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code.core';
import {
  createCodeOutput as createSharedCodeOutput,
  jsxComponents,
  moduleScope,
  type CodeOutputOptions,
} from '../../shared/code-output';
import { createStringifier, type PositionedNode } from './stringifier';
import type { HighlightCompileOptions } from './rehype-code';

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

/** Sätteri's MDX expressions have no estree, the attributes using them are parsed from their code */
const element: Handle = (node: JsxElement, state) =>
  defaultHandlers.mdxJsxFlowElement(
    {
      ...node,
      attributes: node.attributes.map((attr) => {
        if (attr.type === 'mdxJsxExpressionAttribute')
          return { ...attr, data: { estree: parse(`({${attr.value}})`) } };
        if (typeof attr.value !== 'object' || !attr.value) return attr;
        const estree = parse(`(${attr.value.value})`);
        return { ...attr, value: { ...attr.value, data: { estree } } };
      }),
    },
    state,
  );

/** Sätteri's MDX expressions have no estree, parsed as the JSX they are: an expression of comments is empty */
const expression: Handle = (node: { value: string }) => {
  const [statement] = parse(`<>{${node.value}}</>`).body;
  if (statement.type === 'ExpressionStatement' && statement.expression.type === 'JSXFragment')
    return statement.expression.children[0];
};

/** raw HTML of Markdown is kept as text */
const raw: Handle = (node: { value: string }, state) =>
  defaultHandlers.text({ type: 'text', value: node.value }, state);

/** the JSX code of a tree, `components` gets the components that it refers to */
export function jsxToSource(hast: Nodes, components?: Set<string>): string {
  const estree = toEstree(hast, {
    elementAttributeNameCase: 'react',
    handlers: {
      mdxJsxFlowElement: element,
      mdxJsxTextElement: element,
      mdxTextExpression: expression,
      raw,
    },
  });
  if (components) jsxComponents(estree, components);
  const source = toJs(estree, { handlers: jsx }).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
}

export function parse(code: string): Program {
  return parseCode(code, { lang: 'jsx', preserveParens: false }).program as Program;
}

/** read the names declared by the ESM nodes of a document, from their code */
export function esmScope(esm: readonly string[]): () => Set<string> {
  return () => {
    const scope = new Set<string>();
    for (const code of esm) moduleScope(parse(code).body, scope);
    return scope;
  };
}

type CodeNode = PositionedNode & {
  type: string;
  name?: unknown;
  attributes?: unknown;
  value?: unknown;
};

/** the shared code output, on the stringifier of Sätteri */
export function createCodeOutput(
  ctx: MdastVisitorContext,
  options: Pick<CodeOutputOptions<CodeNode>, 'target' | 'isStatic' | 'keep'>,
) {
  return createSharedCodeOutput<CodeNode>({
    ...options,
    stringifier: (expression) => createStringifier(ctx, options.target, expression),
    parse,
  });
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

/** tokens of the highlighter, other elements in code may be MDX components */
function isToken(node: ElementContent): boolean {
  if (node.type === 'text') return true;
  return node.type === 'element' && node.tagName === 'span' && node.children.every(isToken);
}

/** a line of tokens as their HTML, React renders the same DOM */
function lineToHtml(line: Element): MdxJsxTextElementHast | undefined {
  const { className, ...rest } = line.properties;
  if (!className || Object.keys(rest).length > 0 || !line.children.every(isToken)) return;

  return {
    type: 'mdxJsxTextElement',
    name: line.tagName,
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'className',
        value: Array.isArray(className) ? className.join(' ') : String(className),
      },
      {
        type: 'mdxJsxAttribute',
        name: 'dangerouslySetInnerHTML',
        value: {
          type: 'mdxJsxAttributeValueExpression',
          value: `{__html:${JSON.stringify(hastToHtml(line.children))}}`,
        },
      },
    ],
    children: [],
  };
}

function linesToHtml(node: RootContent | Root) {
  if (node.type === 'element' && node.tagName === 'code') {
    node.children = node.children.map(
      (line) => (line.type === 'element' && lineToHtml(line)) || line,
    );
  } else if ('children' in node) {
    for (const child of node.children) linesToHtml(child);
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
  { inline, tokens }: Pick<RehypeCodeFromHighlighterOptions, 'inline'> & HighlightCompileOptions,
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
        if (tokens === 'html') linesToHtml(next);
        if (next.type !== 'root') ctx.replaceNode(element, next);
        else if (next.children.length > 0) ctx.replaceNode(element, next.children);
      },
    },
  });
}
