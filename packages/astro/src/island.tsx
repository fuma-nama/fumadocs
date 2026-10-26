import type { ComponentType, ReactNode } from 'react';
import type { Expression, Program } from 'estree-jsx';
import type { Nodes } from 'hast';
import { type Evaluator, toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import components from 'virtual:fumadocs/mdx-components';
import type { IslandNode } from './shared';

export interface FumadocsIslandProps {
  /** JSON of the root children, as {@link IslandNode} */
  tree: string;
  /** props of `<Content />`, passed to `wrapper` */
  props: Record<string, unknown>;
  /** slots rendered by Astro */
  [slot: string]: unknown;
}

/**
 * The MDX body of a page, created by the Fumadocs integration.
 */
export function FumadocsIsland({ tree, props, ...slots }: FumadocsIslandProps) {
  const evaluator: Evaluator = {
    evaluateExpression(expression) {
      if (expression.type === 'Literal') return expression.value;
      if (expression.type === 'Identifier') {
        if (!(expression.name in components))
          throw new Error(
            `Component "${expression.name}" is not in the MDX components of Fumadocs, add it to the \`components\` module of the integration.`,
          );
        return components[expression.name];
      }

      if (expression.type === 'MemberExpression') {
        const object = evaluator.evaluateExpression(expression.object as Expression) as Record<
          string,
          unknown
        >;
        const { property } = expression;
        if (property.type === 'Identifier') return object[property.name];
        if (property.type === 'Literal') return object[String(property.value)];
      }

      throw new Error(`Unexpected expression in island: ${expression.type}`);
    },
    evaluateProgram() {
      throw new Error('ESM is not supported in island');
    },
  };

  const nodes: IslandNode[] = JSON.parse(tree, (_, value) =>
    typeof value?.$slot === 'string' ? slots[value.$slot] : value,
  );
  const children: unknown[] = [];
  for (const node of nodes) children.push(decode(node));
  const content = toJsx({ type: 'root', children } as Nodes, { components, evaluator });
  // like MDX, `wrapper` is the layout of content
  const Wrapper = components.wrapper as ComponentType<{ children: ReactNode }> | undefined;
  return Wrapper ? <Wrapper {...props}>{content}</Wrapper> : content;
}

/** the estree of a value, evaluated by the evaluator */
function program(expression: object): Program {
  return {
    type: 'Program',
    sourceType: 'module',
    body: [{ type: 'ExpressionStatement', expression: expression as Expression }],
  };
}

function decode(node: IslandNode): unknown {
  if (typeof node === 'string') return { type: 'text', value: node };
  if (!Array.isArray(node)) {
    return {
      type: 'mdxFlowExpression',
      value: '',
      data: { estree: program({ type: 'Literal', value: node }) },
    };
  }

  const children: unknown[] = [];
  if (node[0] === 1) {
    const [, name, props] = node;
    for (let i = 3; i < node.length; i++) children.push(decode(node[i] as IslandNode));
    return {
      type: 'mdxJsxFlowElement',
      name,
      attributes: [
        {
          type: 'mdxJsxExpressionAttribute',
          value: '',
          data: {
            estree: program({
              type: 'ObjectExpression',
              properties: [{ type: 'SpreadElement', argument: { type: 'Literal', value: props } }],
            }),
          },
        },
      ],
      children,
    };
  }

  const [tagName, properties] = node;
  for (let i = 2; i < node.length; i++) children.push(decode(node[i] as IslandNode));
  return { type: 'element', tagName, properties: properties || {}, children };
}
