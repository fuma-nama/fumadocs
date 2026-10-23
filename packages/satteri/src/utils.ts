import { jsx, toJs } from 'estree-util-to-js';
import type { Element, Nodes, Root, RootContent } from 'hast';
import { defaultHandlers, type Handle, toEstree } from 'hast-util-to-estree';
import { defineHastPlugin, type MdastNode } from 'satteri';
import type {
  rehypeCodeFromHighlighter,
  RehypeCodeFromHighlighterOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code.core';

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

/** raw HTML of Markdown is kept as text */
const raw: Handle = (node: { value: string }, state) =>
  defaultHandlers.text({ type: 'text', value: node.value }, state);

export function jsxToSource(hast: Nodes): string {
  const estree = toEstree(hast, {
    elementAttributeNameCase: 'react',
    handlers: { mdxJsxFlowElement: element, mdxJsxTextElement: element, raw },
  });
  const source = toJs(estree, { handlers: jsx }).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
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
