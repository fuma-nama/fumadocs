import { jsx, toJs } from 'estree-util-to-js';
import type { Nodes } from 'hast';
import { defaultHandlers, type Handle, toEstree } from 'hast-util-to-estree';
import type { MdastNode } from 'satteri';

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

export function jsxToSource(hast: Nodes): string {
  const estree = toEstree(hast, {
    elementAttributeNameCase: 'react',
    handlers: { mdxJsxFlowElement: element, mdxJsxTextElement: element },
  });
  const source = toJs(estree, { handlers: jsx }).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
}
