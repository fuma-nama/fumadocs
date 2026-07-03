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

function elementClasses(element: Element) {
  const className = element.properties.className;
  if (Array.isArray(className)) return className.map(String);
  if (typeof className === 'string') return className.split(/\s+/);
  return [];
}

function isHighlighted(element: Element) {
  const className = element.properties.className;
  if (typeof className === 'string') return className.includes('shiki');
  if (Array.isArray(className)) return className.some((c) => String(c).includes('shiki'));
  return false;
}

function shouldSkipHighlight(element: Element) {
  const skipLangs = new Set(['math']);
  const skipClasses = new Set(['language-math', 'math-inline', 'math-display']);
  const targets =
    element.tagName === 'pre'
      ? [
          element,
          ...element.children.filter(
            (child): child is Element => child.type === 'element' && child.tagName === 'code',
          ),
        ]
      : [element];

  for (const target of targets) {
    const classes = elementClasses(target);
    if (classes.some((c) => skipClasses.has(c))) return true;

    const lang = classes.find((c) => c.startsWith('language-'))?.slice('language-'.length);
    if (lang && skipLangs.has(lang)) return true;
  }

  return false;
}

function toTextElement(element: Element, code: string): Element {
  return {
    type: 'element',
    tagName: element.tagName,
    properties: { ...element.properties },
    data: element.data ? { ...element.data } : undefined,
    children: [{ type: 'text', value: code }],
  };
}

/**
 * Build a minimal copy of the code block for the highlighter: it only reads
 * the text content, so flatten children into a single text node instead of
 * deep-cloning the subtree.
 */
function createCodeTree(element: Element, ctx: Pick<HastVisitorContext, 'textContent'>): Root {
  if (element.tagName === 'pre') {
    const head = element.children[0];
    if (!head || head.type !== 'element' || head.tagName !== 'code') {
      return { type: 'root', children: [element] };
    }

    const code = toTextElement(head, ctx.textContent(head));
    return {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'pre',
          properties: { ...element.properties },
          data: element.data ? { ...element.data } : undefined,
          children: [code],
        },
      ],
    };
  }

  return { type: 'root', children: [toTextElement(element, ctx.textContent(element))] };
}

export function rehypeCode(options?: Partial<RehypeCodeOptions>) {
  const runBlock = createRehypeCodeTransformer.call({} as never, options);

  return async () => {
    const inline = options?.inline;

    return defineHastPlugin({
      name: 'rehype-code',
      element: {
        filter: ['pre', 'code'],
        async visit(node, ctx) {
          const element = node as Element;
          if (isHighlighted(element) || shouldSkipHighlight(element)) return;
          if (element.tagName !== 'pre' && !(element.tagName === 'code' && inline)) {
            return;
          }

          // `code` inside `pre` is handled by the `pre` visit; highlighting it
          // separately queues transforms on a replaced node, which get dropped
          if (element.tagName === 'code') {
            const parent = ctx.parent(element);
            if (parent?.type === 'element' && parent.tagName === 'pre') return;
          }

          const tree = createCodeTree(element, ctx);
          await runBlock(tree, {} as never, () => undefined);
          replaceHighlightedNode(element, tree.children[0], ctx);
        },
      },
    });
  };
}
