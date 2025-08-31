import { visit } from 'unist-util-visit';
import type { Transformer } from 'unified';
import type { Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx-jsx';

function toMDX(code: string): MdxJsxFlowElement {
  return {
    type: 'mdxJsxFlowElement',
    name: 'Mermaid',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'chart',
        value: code.trim(),
      },
    ],
    children: [],
  };
}

export interface RemarkMdxMermaidOptions {
  /**
   * @defaultValue mermaid
   */
  lang?: string;
}

/**
 * Convert `mermaid` codeblocks into `<Mermaid />` MDX component
 */
export function remarkMdxMermaid(
  options: RemarkMdxMermaidOptions = {},
): Transformer<Root, Root> {
  const { lang = 'mermaid' } = options;

  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== lang || !node.value) return;

      Object.assign(node, toMDX(node.value));
    });
  };
}
