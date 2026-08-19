import { defineMdastPlugin } from 'satteri';
import type { MdastNode, MdastVisitorContext } from 'satteri';

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

  const typeKeys = Object.keys(typeMap).sort((a, b) => b.length - a.length);

  // splices admonitions into `nodes` (a mutable copy, visited nodes are
  // frozen); returns whether any were built
  function replaceNodes(nodes: MdastNode[], ctx: MdastVisitorContext): boolean {
    let found = false;
    let open = -1;
    let attributes: { type: 'mdxJsxAttribute'; name: string; value: string }[] = [];
    let hasIntercept = false;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      if (node.type !== 'paragraph') continue;

      // paragraphs here always come from the visited tree, so the subtree can
      // be flattened in Rust instead of materializing it in JS
      const text = ctx.textContent(node, { includeImageAlt: false });
      // longest key first, so `:::warning[title]` isn't matched as `:::warn`
      const typeName = typeKeys.find((type) => text.startsWith(`${tag}${type}`));
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
        if (hasIntercept) replaceNodes(children, ctx);
        nodes.splice(open, i - open + 1, {
          type: 'mdxJsxFlowElement',
          name: 'Callout',
          attributes,
          children,
        } as MdastNode);
        found = true;
        // resume after the inserted Callout; nothing before it can still open
        i = open;
        open = -1;
        hasIntercept = false;
        attributes = [];
      }
    }

    return found;
  }

  // the `paragraph` visitor only collects parents of `:::` markers (the Set
  // dedupes sibling visits by identity), and the `after` hook rebuilds each
  // one exactly once
  return () => {
    const parents = new Set<Extract<MdastNode, { children: unknown[] }>>();

    return defineMdastPlugin({
      name: 'remark-admonition',
      paragraph(node, ctx) {
        if (!ctx.textContent(node, { includeImageAlt: false }).startsWith(tag)) return;
        const parent = ctx.parent(node);
        if (parent && 'children' in parent) parents.add(parent);
      },
      after(_root, ctx) {
        for (const parent of parents) {
          const copy = [...(parent.children as MdastNode[])];
          if (replaceNodes(copy, ctx)) ctx.setProperty(parent, 'children', copy);
        }
      },
    });
  };
}
