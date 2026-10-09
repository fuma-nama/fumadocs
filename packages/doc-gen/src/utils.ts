import type { Expression, Program } from 'estree';
import type { MdxJsxAttribute } from 'mdast-util-mdx';

export function createElement(name: string, attributes: object[], children?: unknown): object {
  const element: Record<string, unknown> = {
    type: 'mdxJsxFlowElement',
    name,
    attributes,
  };

  if (children) element.children = children;

  return element;
}

export function expressionToAttribute(key: string, value: Expression): MdxJsxAttribute {
  return {
    type: 'mdxJsxAttribute',
    name: key,
    value: {
      type: 'mdxJsxAttributeValueExpression',
      value: '',
      data: {
        estree: {
          type: 'Program',
          body: [
            {
              type: 'ExpressionStatement',
              expression: value,
            },
          ],
        } as Program,
      },
    },
  };
}

/**
 * Visit a tree in document order, returning `skip` skips the children of a node.
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
