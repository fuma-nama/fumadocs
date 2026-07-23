import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { Root } from 'hast';
import { type Evaluater, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { MDXComponents } from 'mdx/types';
import type { ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';

export interface ObsidianRendererOptions {
  tree: Root;
  filePath?: string;
  structuredData?: StructuredData;
  rehypeToc?: RehypeTOCItemType[];
}

export interface ObsidianRendererResult {
  toc: TOCItemType[];
  body: ReactNode;
}

/**
 * Renders a compiled page. Vault content is plain Markdown, so rendering only
 * maps the hast tree to JSX — no JavaScript in content is evaluated.
 */
export interface ObsidianRenderer {
  structuredData: StructuredData;
  render: (components?: MDXComponents) => Promise<ObsidianRendererResult>;
  renderSync: (components?: MDXComponents) => ObsidianRendererResult;
  /** a serializable form, restore it with `rendererFromSerialized` from `fumadocs-obsidian/client` */
  serialize: () => ObsidianRendererOptions;
}

export function createRenderer(options: ObsidianRendererOptions): ObsidianRenderer {
  const {
    filePath,
    structuredData = {
      headings: [],
      contents: [],
    },
    rehypeToc = [],
    tree,
  } = options;

  function renderSync(components?: MDXComponents): ObsidianRendererResult {
    // component names of JSX elements compile into identifiers, resolve them
    // from the passed components, arbitrary JavaScript is never evaluated
    const evaluater: Evaluater = {
      evaluateExpression(expression) {
        if (expression.type === 'Identifier' && components && expression.name in components) {
          return components[expression.name];
        }

        throw new Error(`cannot evaluate expressions in Markdown content: ${filePath}`);
      },
      evaluateProgram() {
        throw new Error(`cannot evaluate programs in Markdown content: ${filePath}`);
      },
    };

    function render(tree: Root): ReactNode {
      return toJsxRuntime(tree, {
        filePath,
        components,
        development: false,
        createEvaluater() {
          return evaluater;
        },
        ...JsxRuntime,
      });
    }

    const toc = rehypeToc.map(
      (item): TOCItemType => ({
        ...item,
        title: render({
          type: 'root',
          children: item.title.children,
        }),
      }),
    );

    return {
      toc,
      body: render(tree),
    };
  }

  return {
    structuredData,
    renderSync,
    async render(components) {
      return renderSync(components);
    },
    serialize() {
      return options;
    },
  };
}

export function rendererFromSerialized(options: ObsidianRendererOptions): ObsidianRenderer {
  return createRenderer(options);
}
