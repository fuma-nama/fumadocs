import type { Transformer } from 'unified';
import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement } from 'mdast-util-mdx';
import { replaceSource } from './stringifier';
import { walk } from './utils';

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
export function remarkMdxMermaid(options: RemarkMdxMermaidOptions = {}): Transformer<Root, Root> {
  const { lang = 'mermaid' } = options;

  return (tree, file) => {
    walk<Nodes>(tree, (node, idx, parent) => {
      if (node.type !== 'code') return;
      if (node.lang !== lang || !node.value || typeof idx !== 'number' || !parent) return;

      // the element is generated, its Markdown is the authored code block
      replaceSource(file, node, (s) => s.stringify(node));
      parent.children[idx] = toMDX(node.value);
    });
  };
}
