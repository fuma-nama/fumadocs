import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Expression } from 'estree';
import type { Root } from 'hast';
import { type Components, type Evaluater, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import * as PythonComponents from './components';
import defaultMdxComponents from 'fumadocs-ui/mdx';

export interface PythonRendererOptions {
  tree: Root;
  structuredData?: StructuredData;
  rehypeToc?: RehypeTOCItemType[];
}

export interface PythonRendererResult {
  toc: TOCItemType[];
  body: ReactNode;
}

/**
 * Renders a compiled page. The tree only references components by name, so
 * rendering maps it to JSX without evaluating any JavaScript.
 */
export interface PythonRenderer {
  structuredData: StructuredData;
  /**
   * Fumadocs UI's default MDX components and `fumadocs-python/components`
   * are included, pass your own to override them.
   */
  render: (components?: MDXComponents) => Promise<PythonRendererResult>;
}

export function createRenderer(options: PythonRendererOptions): PythonRenderer {
  const { tree, structuredData = { headings: [], contents: [] }, rehypeToc = [] } = options;

  return {
    structuredData,
    async render(userComponents) {
      const components: MDXComponents = {
        ...defaultMdxComponents,
        ...PythonComponents,
        ...userComponents,
      };

      // generated trees only contain component names and string arrays
      function evaluate(expression: Expression): unknown {
        switch (expression.type) {
          case 'Literal':
            return expression.value;
          case 'ArrayExpression':
            return expression.elements.map((item) => item && evaluate(item as Expression));
          case 'Identifier':
            if (expression.name in components) return components[expression.name];
            throw new Error(`Component "${expression.name}" is missing, pass it to render().`);
          default:
            throw new Error(`cannot evaluate ${expression.type} in generated content`);
        }
      }

      const evaluater: Evaluater = {
        evaluateExpression: evaluate,
        evaluateProgram() {
          throw new Error('cannot evaluate programs in generated content');
        },
      };

      function render(tree: Root): ReactNode {
        return toJsxRuntime(tree, {
          components: components as Partial<Components>,
          development: false,
          createEvaluater: () => evaluater,
          ...JsxRuntime,
        });
      }

      return {
        toc: rehypeToc.map((item) => ({
          ...item,
          title: render({ type: 'root', children: item.title.children }),
        })),
        body: render(tree),
      };
    },
  };
}
