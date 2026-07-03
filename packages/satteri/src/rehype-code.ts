import { defineHastPlugin } from 'satteri';
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
  ctx: {
    replaceNode: (node: Element, newNode: RootContent) => void;
    insertAfter: (node: RootContent, newNode: RootContent | RootContent[]) => void;
  },
) {
  if (!next) return;

  const replacement = unwrapReplacement(next);
  if (Array.isArray(replacement)) {
    if (replacement.length === 0) return;
    ctx.replaceNode(element, replacement[0]);
    if (replacement.length > 1) ctx.insertAfter(replacement[0], replacement.slice(1));
    return;
  }

  ctx.replaceNode(element, replacement);
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

function createCodeTree(element: Element, ctx: { textContent: (node: Element) => string }): Root {
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
          if (element.tagName !== 'pre' && !(element.tagName === 'code' && inline)) {
            return;
          }

          const tree = createCodeTree(element, ctx);
          await runBlock(tree, {} as never, () => undefined);
          replaceHighlightedNode(element, tree.children[0], ctx);
        },
      },
    });
  };
}
