import type { Expression, Program } from 'estree';

export function createElement(
  name: string,
  attributes: object[],
  children?: unknown,
): object {
  const element: Record<string, unknown> = {
    type: 'mdxJsxFlowElement',
    name,
    attributes,
  };

  if (children) element.children = children;

  return element;
}

export function expressionToAttribute(key: string, value: Expression): object {
  return {
    type: 'mdxJsxAttribute',
    name: key,
    value: {
      type: 'mdxJsxAttributeValueExpression',
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
