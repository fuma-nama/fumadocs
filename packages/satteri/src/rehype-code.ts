import { defineHastPlugin, type HastVisitorContext } from 'satteri';
import type { Element, Root, RootContent } from 'hast';
import {
  rehypeCode as createRehypeCodeTransformer,
  type RehypeCodeOptions,
} from 'fumadocs-core/mdx-plugins/rehype-code';

export type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';

function unwrapReplacement(node: RootContent | Root): RootContent | RootContent[] {
  if (node.type === 'root') return node.children;
  return node;
}

// Shiki writes literal HTML attribute names into hast `properties`. The
// classic pipeline normalizes them via hast-util-to-estree, but satteri emits
// property keys verbatim, so React would receive `class`/`tabindex` props and
// render them over the component's own `className` (hydration mismatch).
const ATTRIBUTE_TO_PROP: Record<string, string> = {
  class: 'className',
  tabindex: 'tabIndex',
  readonly: 'readOnly',
  contenteditable: 'contentEditable',
};

function normalizeProperties(node: RootContent | Root) {
  if (node.type === 'element' && node.properties) {
    for (const [attribute, prop] of Object.entries(ATTRIBUTE_TO_PROP)) {
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

function replaceHighlightedNode(
  element: Element,
  next: RootContent | Root | undefined,
  ctx: Pick<HastVisitorContext, 'replaceNode' | 'insertAfter'>,
) {
  if (!next) return;

  const replacement = unwrapReplacement(next);
  if (Array.isArray(replacement)) {
    if (replacement.length === 0) return;
    ctx.replaceNode(element, replacement[0]);
    if (replacement.length > 1) ctx.insertAfter(element, replacement.slice(1));
    return;
  }

  ctx.replaceNode(element, replacement);
}

function elementClasses(element: Element): string[] {
  const className = element.properties.className;
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

export function rehypeCode(options?: Partial<RehypeCodeOptions>) {
  const runBlock = createRehypeCodeTransformer.call({} as never, options);
  const inline = options?.inline;

  return defineHastPlugin({
    name: 'rehype-code',
    element: {
      filter: ['pre', 'code'],
      async visit(element, ctx) {
        if (shouldSkipHighlight(element)) return;
        if (element.tagName !== 'pre' && !(element.tagName === 'code' && inline)) {
          return;
        }

        // `code` inside `pre` is handled by the `pre` visit; highlighting it
        // separately queues transforms on a replaced node, which get dropped
        if (element.tagName === 'code') {
          const parent = ctx.parent(element);
          if (parent?.type === 'element' && parent.tagName === 'pre') return;
        }

        const tree: Root = { type: 'root', children: [structuredClone(element)] };
        await runBlock(tree, null as never, () => undefined);
        normalizeProperties(tree);
        replaceHighlightedNode(element, tree.children[0], ctx);
      },
    },
  });
}
