import type { Expression, Program } from 'estree';

export function createElement(
  name: string,
  properties: Record<string, Expression>,
  children?: unknown,
): object {
  const element: Record<string, unknown> = {
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(properties).map(([key, prop]) => ({
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
                expression: prop,
              },
            ],
          } as Program,
        },
      },
    })),
  };

  if (children) element.children = children;

  return element;
}
