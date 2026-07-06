import { jsx, toJs } from 'estree-util-to-js';
import type { Nodes } from 'hast';
import { toEstree } from 'hast-util-to-estree';
import type { MdastNode } from 'satteri';

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

export function jsxToSource(hast: Nodes): string {
  const source = toJs(toEstree(hast, { elementAttributeNameCase: 'react' }), {
    handlers: jsx,
  }).value.trim();
  return source.endsWith(';') ? source.slice(0, -1) : source;
}
