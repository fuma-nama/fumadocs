import { defineMdastPlugin, type MdastPluginDefinition } from 'satteri';
import type { BlockContent, DefinitionContent, PhrasingContent } from 'mdast';

export interface RemarkDirectiveAdmonitionOptions {
  tags?: {
    CalloutContainer?: string;
    CalloutTitle?: string;
    CalloutDescription?: string;
  };
  types?: Record<string, string>;
}

export function remarkDirectiveAdmonition(
  options: RemarkDirectiveAdmonitionOptions = {},
): MdastPluginDefinition {
  const {
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
  } = options;

  return defineMdastPlugin({
    name: 'remark-directive-admonition',
    containerDirective(node, ctx) {
      if (!(node.name in types)) return;

      const attributes = [
        {
          type: 'mdxJsxAttribute' as const,
          name: 'type',
          value: types[node.name]!,
        },
      ];

      for (const [k, v] of Object.entries(node.attributes ?? {})) {
        attributes.push({
          type: 'mdxJsxAttribute',
          name: k,
          value: String(v),
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

      const children: BlockContent[] = [];
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

      ctx.replaceNode(node, {
        type: 'mdxJsxFlowElement',
        attributes,
        name: CalloutContainer,
        children,
      });
    },
  });
}
