import type { Nodes, RootContent } from 'mdast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { Expression } from 'estree-jsx';
import type { MdxJsxFlowElement, MdxJsxTextElement, MdxjsEsm } from 'mdast-util-mdx';
import type Hast from 'hast';

export function isJsxElement(node: Nodes): node is MdxJsxFlowElement | MdxJsxTextElement {
  return node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';
}

/**
 * Visit a tree in document order, returning `skip` skips the children of a node. Unlike `unist-util-visit`, it doesn't
 * look up the index of each node in its parent, which is quadratic on wide trees.
 */
export function walk<N extends { type: string; children?: N[] }>(
  node: N,
  visitor: (
    node: N,
    index: number | undefined,
    parent: { children: N[] } | undefined,
  ) => 'skip' | void,
  index?: number,
  parent?: { children: N[] },
): void {
  if (visitor(node, index, parent) === 'skip' || !node.children) return;
  for (let i = 0; i < node.children.length; i++)
    walk(node.children[i], visitor, i, node as { children: N[] });
}

export function flattenNode(node: RootContent): string {
  if ('children' in node) return node.children.map(flattenNode).join('');

  if ('value' in node && typeof node.value === 'string') return node.value;

  return '';
}
export function flattenNodeHast(node: Hast.RootContent): string {
  if ('children' in node) {
    return node.children.map(flattenNodeHast).join('');
  }

  return 'value' in node && typeof node.value === 'string' ? node.value : '';
}

export function toMdxExport(name: string, value: unknown): MdxjsEsm {
  return toMdxExportRaw(name, valueToEstree(value));
}

export function toMdxExportRaw(name: string, expression: Expression): MdxjsEsm {
  return {
    type: 'mdxjsEsm',
    value: '',
    data: {
      estree: {
        type: 'Program',
        sourceType: 'module',
        body: [
          {
            type: 'ExportNamedDeclaration',
            attributes: [],
            specifiers: [],
            declaration: {
              type: 'VariableDeclaration',
              kind: 'let',
              declarations: [
                {
                  type: 'VariableDeclarator',
                  id: {
                    type: 'Identifier',
                    name,
                  },
                  init: expression,
                },
              ],
            },
          },
        ],
      },
    },
  };
}

export function handleTag(value: string, tag: string): string | false {
  const idx = value.indexOf(tag);
  if (idx !== -1) {
    return value.slice(0, idx).trimEnd() + value.slice(idx + tag.length);
  }

  return false;
}
