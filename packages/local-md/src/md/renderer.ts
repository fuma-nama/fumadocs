import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import { stableHash } from 'stable-hash';
import { RawPage } from '@/storage';
import * as JsxRuntime from 'react/jsx-runtime';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Root } from 'hast';
import { VFile } from 'vfile';
import type { JSExecutor, JSExecutorConfig } from '@/js/executor';
import type { CompileResult, MarkdownCompiler } from './compiler';
import { pathToFileURL } from 'node:url';

export interface PageRenderer {
  structuredData: StructuredData;
  render: (
    components?: Components,
    context?: Record<string, unknown>,
  ) => Promise<{
    exports: Record<string, unknown>;
    toc: TOCItemType[];
    body: ReactNode;
  }>;
}

export interface MarkdownRendererOptions {
  /**
   * the engine to execute JavaScript (given estree with JSX)
   *
   * by default, it uses a virtual JS engine with limited
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
  const cache = new Map<string, Promise<CompileResult>>();

  function render(
    tree: Root,
    file: VFile,
    executor: JSExecutor,
    components: Components | undefined,
    context: Record<string, unknown>,
  ): ReactNode {
    return toJsxRuntime(tree, {
      filePath: file.path,
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

  return {
    async compile<V>(page: RawPage<V>): Promise<PageRenderer> {
      const cacheKey = stableHash([page, compiler]);
      let promise = cache.get(cacheKey);
      if (!promise) {
        promise = compiler.compile({
          path: page.absolutePath,
          value: page.content,
          data: { frontmatter: page.frontmatter },
        });
        cache.set(cacheKey, promise);
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
            const toc =
              compiled.file.data.rehypeToc?.map(
                (item): TOCItemType => ({
                  ...item,
                  title: render(
                    {
                      type: 'root',
                      children: item.title.children,
                    },
                    compiled.file,
                    executor,
                    components,
                    context,
                  ),
                }),
              ) ?? [];

            return {
              toc,
              body: render(compiled.tree, compiled.file, executor, components, context),
              exports: executor.getExports(),
            };
          }

          const _out = await executeMdx(
            compiled.code,
            pathToFileURL(page.absolutePath).href,
            userContext,
          );
          const out = _out as {
            toc: TOCItemType[];
            default: (props: { components?: Components }) => ReactNode;
          };

          return {
            toc: out.toc,
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
