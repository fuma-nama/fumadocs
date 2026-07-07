import { defineMdastPlugin } from 'satteri';

export interface RemarkMdxMermaidOptions {
  lang?: string;
}

export function remarkMdxMermaid({ lang = 'mermaid' }: RemarkMdxMermaidOptions = {}) {
  return defineMdastPlugin({
    name: 'remark-mdx-mermaid',
    code(node, ctx) {
      if (node.lang !== lang || !node.value) return;

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
