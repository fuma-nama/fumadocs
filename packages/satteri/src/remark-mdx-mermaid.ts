import { defineMdastPlugin } from 'satteri';
import { replaceChildAt } from '@/utils';

export interface RemarkMdxMermaidOptions {
  lang?: string;
}

export function remarkMdxMermaid({ lang = 'mermaid' }: RemarkMdxMermaidOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-mdx-mermaid',
    code(node, ctx) {
      if (node.lang !== lang || !node.value) return;

      const parent = ctx.parent(node);
      const index = ctx.indexOf(node);
      if (!parent || index === undefined) return;

      ctx.setProperty(
        parent,
        'children',
        replaceChildAt(parent.children, index, {
          type: 'mdxJsxFlowElement',
          name: 'Mermaid',
          attributes: [
            {
              type: 'mdxJsxAttribute',
              name: 'chart',
              value: node.value.trim(),
            },
          ],
          children: [],
        }),
      );
    },
  });
}
