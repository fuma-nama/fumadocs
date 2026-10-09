/// <reference types="mdast-util-mdx" />
import type { Transformer } from 'unified';
import type { Nodes, Root, RootContent } from 'mdast';
import { replaceSource } from 'fumadocs-core/mdx-plugins/stringifier';
import { walk } from './utils';

export function remarkShow(options?: {
  variables?: Record<string, unknown>;
}): Transformer<Root, Root> {
  const variables = options?.variables ?? {};

  return async (tree, file) => {
    const { toJs } = await import('estree-util-to-js');
    const tasks: Promise<void>[] = [];

    walk<Nodes>(tree, (node) => {
      if (node.type !== 'mdxJsxFlowElement' || node.name !== 'show') return;

      for (const attr of node.attributes) {
        if (attr.type !== 'mdxJsxAttribute' || attr.name !== 'on') continue;

        if (!attr.value || typeof attr.value !== 'object' || !attr.value.data?.estree)
          // skip invalid <show> components and its children
          return 'skip';

        const js = toJs(attr.value.data.estree);

        const callback = new Function(...Object.keys(variables), `return ${js.value}`)(
          ...Object.values(variables),
        );

        tasks.push(
          (async () => {
            const value = typeof callback === 'function' ? await callback(file) : callback;
            // in Markdown output, the content without the element
            replaceSource(file, node, value === true ? (s) => s.inner(node) : '');

            Object.assign(node, {
              type: 'mdxJsxFlowElement',
              name: null,
              attributes: [],
              children: value === true ? node.children : [],
            } satisfies RootContent);
          })(),
        );

        return 'skip';
      }
    });

    await Promise.all(tasks);
  };
}
