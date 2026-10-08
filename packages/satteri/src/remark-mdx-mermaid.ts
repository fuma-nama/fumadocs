import { defineMdastPlugin } from 'satteri';
import { replaceSource } from './stringifier';

export interface RemarkMdxMermaidOptions {
  lang?: string;
}

export function remarkMdxMermaid({ lang = 'mermaid' }: RemarkMdxMermaidOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-mdx-mermaid',
    code(node, ctx) {
      if (node.lang !== lang || !node.value) return;

      // the element is generated, its Markdown is the authored code block
      replaceSource(ctx, node, (s) => s.stringify(node));
      ctx.replaceNode(node, {
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
      });
    },
  });
}
