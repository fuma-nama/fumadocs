import { defineHastPlugin } from 'satteri';
import type { Element, Root } from 'hast';
import type { Processor } from 'unified';
import type { VFile } from 'vfile';
import { rehypeCode as unifiedRehypeCode, type RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';

export type { RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';

export function rehypeCode(options?: Partial<RehypeCodeOptions>) {
  return async () => {
    const transformer = unifiedRehypeCode.call({} as Processor, options);

    return defineHastPlugin({
      name: 'rehype-code',
      element: {
        filter: ['pre', 'code'],
        async visit(node, ctx) {
          const element = node as Element;
          if (element.tagName !== 'pre' && !(element.tagName === 'code' && options?.inline)) {
            return;
          }

          const tree: Root = { type: 'root', children: [structuredClone(element)] };
          await transformer(tree, {} as VFile, () => undefined);
          const next = tree.children[0];
          if (next) ctx.replaceNode(element, next);
        },
      },
    });
  };
}

// ponytail: delegates highlighting to fumadocs-core's unified shiki on a one-node hast subtree
