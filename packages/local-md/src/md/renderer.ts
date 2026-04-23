import type { TOCItemType } from 'fumadocs-core/toc';
import type { RehypeTOCItemType, StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import * as JsxRuntime from 'react/jsx-runtime';
import { type Evaluater, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import type { JSExecutor, JSExecutorConfig } from '@/js/executor';
import type { MDXComponents, MDXContent } from 'mdx/types';

export interface PageRenderer<ModuleExports = Record<string, unknown>> {
  structuredData: StructuredData;
  render: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => Promise<{
    exports: ModuleExports;
    toc: TOCItemType[];
    body: ReactNode;
  }>;
  serialize: () => MarkdownRendererSerializedOptions;
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
  executor?: (ctx: JSExecutorConfig) => JSExecutor | Promise<JSExecutor>;
}

async function defaultGetExecutor(config: JSExecutorConfig) {
  const { executorVirtual } = await import('@/js/executor-virtual');
  return executorVirtual(config);
}

export function fromAst<M>(options: MarkdownRendererASTOptions): PageRenderer<M> {
  const {
    executor: getExecutor = defaultGetExecutor,
    filePath,
    structuredData,
    rehypeToc,
    tree,
  } = options;

  return {
    get structuredData() {
      return (
        structuredData ?? {
          headings: [],
          contents: [],
        }
      );
    },
    async render(components, userContext) {
      const context = { ...components, ...userContext };
      const executor = await getExecutor({
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

      const toc =
        rehypeToc?.map(
          (item): TOCItemType => ({
            ...item,
            title: render({
              type: 'root',
              children: item.title.children,
            }),
          }),
        ) ?? [];

      return {
        toc,
        body: render(tree),
        exports: executor.getExports() as M,
      };
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

export function fromJS<M>(options: MarkdownRendererJSOptions): PageRenderer<M> {
  const { code, structuredData, baseUrl } = options;

  return {
    get structuredData() {
      return (
        structuredData ?? {
          headings: [],
          contents: [],
        }
      );
    },
    async render(components, userContext) {
      const _out = await executeMdx(code, baseUrl, userContext);
      const out = _out as {
        toc?: TOCItemType[];
        default: MDXContent;
      };

      return {
        toc: out.toc ?? [],
        body: JsxRuntime.jsx(out.default, { components }),
        exports: out as M,
      };
    },
    serialize() {
      return { type: 'js', ...options };
    },
  };
}

export function fromSerialized<M>(options: MarkdownRendererSerializedOptions): PageRenderer<M> {
  if (options.type === 'js') return fromJS(options);
  return fromAst(options);
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(executeMdx).constructor;

/**
 * Note: unsafe by design
 */
async function executeMdx(compiled: string, baseUrl: string | undefined, scope?: object) {
  const fullScope = {
    ...scope,
    opts: {
      ...JsxRuntime,
      baseUrl,
    },
  };

  const hydrateFn = new AsyncFunction(...Object.keys(fullScope), compiled);
  return await hydrateFn.apply(hydrateFn, Object.values(fullScope));
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
