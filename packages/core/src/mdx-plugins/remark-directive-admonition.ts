import { BlockContent, DefinitionContent, Root } from 'mdast';
import type { MdxJsxAttribute, MdxJsxFlowElement } from 'mdast-util-mdx-jsx';
import { Transformer } from 'unified';
import { visit } from 'unist-util-visit';

export interface RemarkDirectiveAdmonitionOptions {
  /**
   * the tag names of Callout component.
   */
  tags?: {
    CalloutContainer?: string;
    CalloutTitle?: string;
    CalloutDescription?: string;
  };

  /**
   * All supported admonition types and their linked Callout type.
   *
   * When specified, all defaults will be cleared.
   */
  types?: Record<string, string>;
}

/**
 * Remark Plugin to support Admonition syntax in Docusaurus, useful for migrating from Docusaurus.
 *
 * Requires [`remark-directive`](https://github.com/remarkjs/remark-directive) to be configured.
 */
export function remarkDirectiveAdmonition({
  tags: {
    CalloutContainer = 'CalloutContainer',
    CalloutTitle = 'CalloutTitle',
    CalloutDescription = 'CalloutDescription',
  } = {},
  types = {
    note: 'info',
    tip: 'info',
    info: 'info',
    warning: 'warning',
    danger: 'error',
    success: 'success',
  },
}: RemarkDirectiveAdmonitionOptions = {}): Transformer<Root, Root> {
  return (tree) => {
    visit(tree, 'containerDirective', (node) => {
      if (!(node.name in types)) return;

      const attributes: MdxJsxAttribute[] = [
        {
          type: 'mdxJsxAttribute',
          name: 'type',
          value: types[node.name],
        },
      ];

      for (const [k, v] of Object.entries(node.attributes ?? {})) {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: k,
          value: v,
        });
      }

      const titleNodes: (BlockContent | DefinitionContent)[] = [];
      const descriptionNodes: (BlockContent | DefinitionContent)[] = [];

      for (const item of node.children) {
        if (
          item.data &&
          'directiveLabel' in item.data &&
          item.data.directiveLabel
        ) {
          titleNodes.push(item);
        } else {
          descriptionNodes.push(item);
        }
      }

      Object.assign({
        type: 'mdxJsxFlowElement',
        attributes,
        name: CalloutContainer,
        children: [
          titleNodes.length > 0 && {
            type: 'mdxJsxFlowElement' as const,
            name: CalloutTitle,
            attributes: [],
            children: titleNodes,
          },
          descriptionNodes.length > 0 && {
            type: 'mdxJsxFlowElement' as const,
            name: CalloutDescription,
            attributes: [],
            children: descriptionNodes,
          },
        ].filter((v) => v !== false),
      } satisfies MdxJsxFlowElement);
    });
  };
}
