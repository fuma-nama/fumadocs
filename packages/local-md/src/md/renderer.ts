import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import type { RawPage } from '@/storage';
import * as JsxRuntime from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import type { JSExecutor, JSExecutorConfig } from '@/js/executor';
import type { CompileResult, MarkdownCompiler } from './compiler';
import { pathToFileURL } from 'node:url';
import type { MDXComponents, MDXContent } from 'mdx/types';

export interface PageRenderer {
  structuredData: StructuredData;
  render: (
    components?: MDXComponents,
    context?: Record<string, unknown>,
  ) => Promise<{
    exports: Record<string, unknown>;
    toc: TOCItemType[];
    body: ReactNode;
  }>;
}

export interface MarkdownRendererOptions {
  /**
   * the engine to execute JavaScript in Markdown, **not used for MDX files, MDX will always use native JS engine.**
   *
   * by default, it uses a virtual JS engine with limited features.
   */
  executor?: (ctx: JSExecutorConfig) => JSExecutor | Promise<JSExecutor>;
}

export function createMarkdownRenderer(
  compiler: MarkdownCompiler,
  options: MarkdownRendererOptions = {},
) {
  const {
    executor: getExecutor = async (config) => {
      const { executorVirtual } = await import('@/js/executor-virtual');
      return executorVirtual(config);
    },
  } = options;
  const cache = new WeakMap<RawPage<unknown>, Promise<CompileResult>>();

  return {
    async compile<V>(page: RawPage<V>): Promise<PageRenderer> {
      let promise = cache.get(page);
      if (!promise) {
        promise = compiler.compile({
          path: page.absolutePath,
          value: page.content,
          data: { frontmatter: page.frontmatter },
        });
        cache.set(page, promise);
      }

      const compiled = await promise;

      return {
        get structuredData() {
          return (
            compiled.file.data.structuredData ?? {
              headings: [],
              contents: [],
            }
          );
        },
        async render(components, userContext) {
          if (compiled.type === 'ast') {
            const executor = await getExecutor({
              jsx: JsxRuntime,
              filePath: page.absolutePath,
            });

            const context = { ...components, ...userContext };

            function render(tree: Root): ReactNode {
              return toJsxRuntime(tree, {
                filePath: page.absolutePath,
                components,
                development: false,
                createEvaluater() {
                  return {
                    evaluateProgram(program) {
                      return executor.program(program, context);
                    },
                    evaluateExpression(node) {
                      return executor.expression(node, context);
                    },
                  };
                },
                ...JsxRuntime,
              });
            }

            const toc =
              compiled.file.data.rehypeToc?.map(
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
              body: render(compiled.tree),
              exports: executor.getExports(),
            };
          }

          const _out = await executeMdx(
            compiled.code,
            pathToFileURL(page.absolutePath).href,
            userContext,
          );
          const out = _out as {
            toc?: TOCItemType[];
            default: MDXContent;
          };

          return {
            toc: out.toc ?? [],
            body: JsxRuntime.jsx(out.default, { components }),
            exports: out,
          };
        },
      };
    },
  };
}

const AsyncFunction: new (...args: string[]) => (...args: unknown[]) => Promise<unknown> =
  Object.getPrototypeOf(executeMdx).constructor;

/**
 * Note: unsafe by design
 */
async function executeMdx(compiled: string, baseUrl: string, scope?: object) {
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
