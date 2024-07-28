import { type Transformer } from 'unified';
import { visit } from 'unist-util-visit';
import { type Root, type RootContent } from 'mdast';
import { flattenNode } from '@/mdx-plugins/remark-utils';

export interface RemarkAdmonitionOptions {
  tag?: string;
  types?: string[];

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
  const types = options.types ?? ['warn', 'info', 'error'];
  const tag = options.tag ?? ':::';
  // compatible with Docusaurus
  const typeMap = options.typeMap ?? {
    note: 'info',
    tip: 'info',
    warning: 'warn',
    danger: 'error',
  };

  function replaceNodes(nodes: RootContent[]): RootContent[] {
    if (nodes.length === 0) return nodes;
    let open = -1,
      end = -1;

    const attributes = [];

    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].type !== 'paragraph') continue;

      const text = flattenNode(nodes[i]);
      const start = types.find((type) => text.startsWith(`${tag}${type}`));

      if (start) {
        if (open !== -1) throw new Error('Nested callout is not supported');
        open = i;

        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'type',
          value: start in typeMap ? typeMap[start] : start,
        });

        const rest = text.slice(`${tag}${start}`.length);
        if (rest.startsWith('[') && rest.endsWith(']')) {
          attributes.push({
            type: 'mdxJsxAttribute',
            name: 'title',
            value: rest.slice(1, -1),
          });
        }
      }

      if (open !== -1 && text === tag) {
        end = i;
        break;
      }
    }

    if (open === -1 || end === -1) return nodes;

    return [
      ...nodes.slice(0, open),
      {
        type: 'mdxJsxFlowElement',
        name: 'Callout',
        attributes,
        children: nodes.slice(open + 1, end),
      } as RootContent,
      ...replaceNodes(nodes.slice(end + 1)),
    ];
  }

  return (tree) => {
    visit(tree, (node) => {
      if (!('children' in node)) return 'skip';

      const result = replaceNodes(node.children);
      if (result === node.children) return;

      node.children = result;
      return 'skip';
    });
  };
}
