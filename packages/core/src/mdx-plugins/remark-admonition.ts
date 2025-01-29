import { type Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { type Root, type RootContent } from 'mdast';
import { flattenNode } from '@/mdx-plugins/remark-utils';

export interface RemarkAdmonitionOptions {
  tag?: string;

  /**
   * Map type to another type
   */
  typeMap?: Record<string, string>;
}

/**
 * Remark Plugin to support Admonition syntax
 *
 * Useful when Migrating from Docusaurus
 */
export function remarkAdmonition(
  options: RemarkAdmonitionOptions = {},
): Transformer<Root, Root> {
  const tag = options.tag ?? ':::';
  // compatible with Docusaurus
  const typeMap = options.typeMap ?? {
    info: 'info',
    warn: 'warn',

    note: 'info',
    tip: 'info',
    warning: 'warn',
    danger: 'error',
  };

  function replaceNodes(nodes: RootContent[]) {
    if (nodes.length === 0) return;

    let open = -1;
    let attributes = [];
    // if children contain nested admonitions
    let hasIntercept = false;

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type !== 'paragraph') continue;

      const text = flattenNode(nodes[i]);
      const typeName = Object.keys(typeMap).find((type) =>
        text.startsWith(`${tag}${type}`),
      );

      if (typeName) {
        if (open !== -1) {
          hasIntercept = true;
          continue;
        }

        open = i;

        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'type',
          value: typeMap[typeName],
        });

        const meta = text.slice(`${tag}${typeName}`.length);
        if (meta.startsWith('[') && meta.endsWith(']')) {
          attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: meta.slice(1, -1),
          });
        }
      }

      if (open !== -1 && text === tag) {
        const children = nodes.slice(open + 1, i);

        nodes.splice(open, i - open + 1, {
          type: 'mdxJsxFlowElement',
          name: 'Callout',
          attributes,
          children: hasIntercept ? replaceNodes(children) : children,
        } as RootContent);
        open = -1;
        hasIntercept = false;
        attributes = [];
        i = open;
      }
    }
  }

  return (tree) => {
    visit(tree, (node) => {
      if (!('children' in node)) return;

      replaceNodes(node.children);
    });
  };
}
