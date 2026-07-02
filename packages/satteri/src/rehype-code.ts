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

          const tree: Root = { type: 'root', children: [structuredClone(element)] };
          await runBlock(tree, {} as never, () => undefined);
          replaceHighlightedNode(element, tree.children[0], ctx);
        },
      },
    });
  };
}
