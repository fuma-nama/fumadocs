import type {
  BlockContent,
  DefinitionContent,
  PhrasingContent,
  Root,
} from 'mdast';
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
    warn: 'warning',
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

      const titleNodes: PhrasingContent[] = [];
      const descriptionNodes: (BlockContent | DefinitionContent)[] = [];

      for (const item of node.children) {
        if (item.type === 'paragraph' && item.data?.directiveLabel) {
          titleNodes.push(...item.children);
        } else {
          descriptionNodes.push(item);
        }
      }

      const children: MdxJsxFlowElement[] = [];

      if (titleNodes.length > 0) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: CalloutTitle,
          attributes: [],
          children: titleNodes as BlockContent[],
        });
      }

      if (descriptionNodes.length > 0) {
        children.push({
          type: 'mdxJsxFlowElement',
          name: CalloutDescription,
          attributes: [],
          children: descriptionNodes,
        });
      }

      Object.assign(node, {
        type: 'mdxJsxFlowElement',
        attributes,
        name: CalloutContainer,
        children,
      } satisfies MdxJsxFlowElement);
    });
  };
}
