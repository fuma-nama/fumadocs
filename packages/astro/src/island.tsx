import { parse } from 'devalue';
import { createElement, Fragment, type ComponentType, type ReactNode } from 'react';
import type { Expression, Program } from 'estree-jsx';
import type { ElementContent, Properties, Root } from 'hast';
import type { MDXComponents } from 'mdx/types';
import { type Evaluator, toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import type { Slot } from './mdx-runtime';

export interface FumadocsIslandProps {
  /** the root children from `serializeIsland()`, as {@link IslandNode} */
  tree: string;
  /** props of `<Content />`, passed to `wrapper` */
  props: Record<string, unknown>;
  /** the tree of React content: elements have React props, and are created as they are */
  react?: boolean;
  /** slots rendered by Astro */
  [slot: string]: unknown;
}

/** a node of the island tree, see `island-plugin.ts` for MDX, and `island-node.tsx` for React content */
export type IslandNode =
  | string
  | Slot
  | [tagName: string, properties: Record<string, unknown> | 0, ...children: IslandNode[]]
  | [jsx: 1, name: string | null, props: Record<string, unknown>, ...children: IslandNode[]];

/**
 * Create the island rendering the MDX body of pages, with the MDX components of a collection.
 */
export function createIsland(components: MDXComponents) {
  const evaluator: Evaluator = {
    evaluateExpression(expression) {
      if (expression.type === 'Literal') return expression.value;
      if (expression.type === 'Identifier') {
        if (!Object.hasOwn(components, expression.name))
          throw new Error(
            `Component "${expression.name}" is not in the MDX components of Fumadocs, add it to the \`components\` module of the collection.`,
          );
        return components[expression.name];
      }

      if (expression.type === 'MemberExpression' && expression.object.type !== 'Super') {
        // components like `Tabs.Tab` are functions with properties
        const object = evaluator.evaluateExpression(expression.object) as Record<string, unknown>;
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
  // like MDX, `wrapper` is the layout of content
  const Wrapper = components.wrapper;

  function toReact(node: IslandNode): ReactNode {
    // text, and slots replaced by their content when parsed
    if (!Array.isArray(node)) return node as ReactNode;
    if (node[0] === 1) {
      const [, name, props, ...children] = node;
      const type =
        name === null ? Fragment : evaluator.evaluateExpression({ type: 'Identifier', name });
      return createElement(type as ComponentType, props, ...children.map(toReact));
    }

    const [tagName, props, ...children] = node;
    return createElement(tagName, props || null, ...children.map(toReact));
  }

  return function FumadocsIsland({ tree, props, react, ...slots }: FumadocsIslandProps) {
    const nodes: IslandNode[] = parse(tree, {
      // own slots only, names like `constructor` aren't slots
      slot: (name: string) => (Object.hasOwn(slots, name) ? slots[name] : undefined),
    });
    let content: ReactNode;
    if (react) {
      content = createElement(Fragment, null, ...nodes.map(toReact));
    } else {
      const root: Root = { type: 'root', children: nodes.map(decode) };
      content = toJsx(root, { components, evaluator });
    }
    return Wrapper ? <Wrapper {...props}>{content}</Wrapper> : content;
  };
}

/** an expression of `value`, the evaluator returns the value of literals as it is */
function literal(value: unknown): Expression {
  return { type: 'Literal', value } as Expression;
}

/** the estree of a value, evaluated by the evaluator */
function program(expression: Expression): Program {
  return {
    type: 'Program',
    sourceType: 'module',
    body: [{ type: 'ExpressionStatement', expression }],
  };
}

function decode(node: IslandNode): ElementContent {
  if (typeof node === 'string') return { type: 'text', value: node };
  // slots replaced by their content when parsed
  if (!Array.isArray(node)) {
    return {
      type: 'mdxFlowExpression',
      value: '',
      data: { estree: program(literal(node)) },
    };
  }

  if (node[0] === 1) {
    const [, name, props, ...children] = node;
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
              properties: [{ type: 'SpreadElement', argument: literal(props) }],
            }),
          },
        },
      ],
      children: children.map(decode),
    };
  }

  const [tagName, properties, ...children] = node;
  return {
    type: 'element',
    tagName,
    properties: (properties || {}) as Properties,
    children: children.map(decode),
  };
}
