import type { TOCItemType } from 'fumadocs-core/toc';
import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { type Evaluater, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import type { JSExecutor, JSExecutorConfig } from '@/js/executor';
import type { MDXComponents, MDXContent } from 'mdx/types';
import { executorVirtual } from '@/js/executor-virtual';

export interface MarkdownRenderer<M = Record<string, unknown>> {
  structuredData: StructuredData;
  render: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => Promise<MarkdownRendererResult<M>>;
  renderSync: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => MarkdownRendererResult<M>;
  serialize: () => MarkdownRendererSerializedOptions;
}

export interface MarkdownRendererResult<M = Record<string, unknown>> {
  exports: M;
  toc: TOCItemType[];
  body: ReactNode;
}

export type MarkdownRendererSerializedOptions =
  | ({
      type: 'js';
    } & MarkdownRendererJSOptions)
  | ({
      type: 'ast';
    } & Omit<MarkdownRendererASTOptions, 'executor'>);

export interface MarkdownRendererJSOptions {
  code: string;
  filePath: string;
  baseUrl?: string;
  structuredData?: StructuredData;
}

export interface MarkdownRendererASTOptions {
  tree: Root;
  filePath: string;
  structuredData?: StructuredData;
  rehypeToc?: RehypeTOCItemType[];

  /**
   * the engine to execute JavaScript in Markdown, **not used for MDX files, MDX will always use native JS engine.**
   *
   * by default, it uses a virtual JS engine with limited features.
   */
  executor?: (ctx: JSExecutorConfig) => JSExecutor;
}

export function fromAst<M>(options: MarkdownRendererASTOptions): MarkdownRenderer<M> {
  const {
    executor: getExecutor = executorVirtual,
    filePath,
    structuredData = {
      headings: [],
      contents: [],
    },
    rehypeToc = [],
    tree,
  } = options;

  function renderSync(components?: MDXComponents, userContext?: Record<string, unknown>) {
    const context = { ...components, ...userContext };
    const executor = getExecutor({
      jsx: JsxRuntime,
      filePath,
    });
    const evaluater = toEvaluater(executor, context);

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
      exports: executor.getExports() as M,
    };
  }

  return {
    structuredData,
    renderSync,
    async render(components, userContext) {
      return renderSync(components, userContext);
    },
    serialize() {
      const { executor: _, ...rest } = options;

      return {
        type: 'ast',
        ...rest,
      };
    },
  };
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(async function () {}).constructor;

export function fromJS<M>(options: MarkdownRendererJSOptions): MarkdownRenderer<M> {
  const {
    code,
    structuredData = {
      headings: [],
      contents: [],
    },
    baseUrl,
  } = options;

  return {
    structuredData,
    async render(components, context) {
      const fullScope = {
        ...context,
        opts: {
          ...JsxRuntime,
          baseUrl,
        },
      };

      const hydrateFn = new AsyncFunction(...Object.keys(fullScope), code);
      const out = (await hydrateFn.apply(hydrateFn, Object.values(fullScope))) as {
        toc?: TOCItemType[];
        default: MDXContent;
      } & M;

      return {
        toc: out.toc ?? [],
        body: JsxRuntime.jsx(out.default, { components }),
        exports: out,
      };
    },
    renderSync(components, context) {
      const fullScope = {
        ...context,
        opts: {
          ...JsxRuntime,
          baseUrl,
        },
      };

      const hydrateFn = new Function(...Object.keys(fullScope), code);
      const out = hydrateFn.apply(hydrateFn, Object.values(fullScope)) as {
        toc?: TOCItemType[];
        default: MDXContent;
      } & M;

      return {
        toc: out.toc ?? [],
        body: JsxRuntime.jsx(out.default, { components }),
        exports: out,
      };
    },
    serialize() {
      return { type: 'js', ...options };
    },
  };
}

export function fromSerialized<M>(options: MarkdownRendererSerializedOptions): MarkdownRenderer<M> {
  if (options.type === 'js') return fromJS(options);
  return fromAst(options);
}

function toEvaluater(executor: JSExecutor, context: Record<string, unknown>): Evaluater {
  return {
    evaluateProgram(program) {
      return executor.program(program, context);
    },
    evaluateExpression(node) {
      return executor.expression(node, context);
    },
  };
}
