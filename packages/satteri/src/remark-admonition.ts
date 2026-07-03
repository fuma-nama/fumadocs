import { defineMdastPlugin } from 'satteri';
import { flattenNode } from '@/utils';
import type { MdastNode } from 'satteri';

export interface RemarkAdmonitionOptions {
  tag?: string;
  typeMap?: Record<string, string>;
}

export function remarkAdmonition(options: RemarkAdmonitionOptions = {}) {
  const tag = options.tag ?? ':::';
  const typeMap = options.typeMap ?? {
    info: 'info',
    warn: 'warn',
    note: 'info',
    tip: 'info',
    warning: 'warn',
    danger: 'error',
  };

  function replaceNodes(nodes: MdastNode[]) {
    if (nodes.length === 0) return;

    let open = -1;
    const attributes: { type: 'mdxJsxAttribute'; name: string; value: string }[] = [];
    let hasIntercept = false;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type !== 'paragraph') continue;

      const text = flattenNode(node);
      const typeName = Object.keys(typeMap).find((type) => text.startsWith(`${tag}${type}`));
      if (typeName) {
        if (open !== -1) {
          hasIntercept = true;
          continue;
        }

        open = i;
        attributes.push({
          type: 'mdxJsxAttribute',
          name: 'type',
          value: typeMap[typeName]!,
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
        } as MdastNode);
        open = -1;
        hasIntercept = false;
        attributes.length = 0;
        i = open;
      }
    }
  }

  return defineMdastPlugin({
    name: 'remark-admonition',
    paragraph(node, ctx) {
      const parent = ctx.parent(node);
      if (!parent || !('children' in parent)) return;
      replaceNodes(parent.children as MdastNode[]);
      ctx.setProperty(parent, 'children', parent.children);
    },
    blockquote(node, ctx) {
      const parent = ctx.parent(node);
      if (!parent || !('children' in parent)) return;
      replaceNodes(parent.children as MdastNode[]);
      ctx.setProperty(parent, 'children', parent.children);
    },
    list(node, ctx) {
      const parent = ctx.parent(node);
      if (!parent || !('children' in parent)) return;
      replaceNodes(parent.children as MdastNode[]);
      ctx.setProperty(parent, 'children', parent.children);
    },
  });
}
