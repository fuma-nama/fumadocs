import type { CompileResult, BaseCompiler } from './compiler';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import { stableHash } from 'stable-hash';
import { RawPage } from '@/storage';
import * as JsxRuntime from 'react/jsx-runtime';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Root } from 'hast';
import { VFile } from 'vfile';
import type { JSExecutor } from '@/js/executor';
import { executorVirtual } from '@/js/executor-virtual';

export interface PageRenderer {
  structuredData: StructuredData;
  render: (components?: Components) => Promise<{
    exports: Record<string, unknown>;
    toc?: TOCItemType[];
    body: ReactNode;
  }>;
}

export interface MarkdownRendererOptions {
  executor?: (ctx: { jsx: typeof JsxRuntime }) => JSExecutor;
}

export function createMarkdownRenderer(
  compiler: BaseCompiler,
  options: MarkdownRendererOptions = {},
) {
  const { executor: getExecutor = executorVirtual } = options;
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

  function getExports(
    tree: Root,
    sync: JSExecutor,
    context: Record<string, unknown>,
  ): Record<string, unknown> {
    for (const node of tree.children) {
      if (node.type !== 'mdxjsEsm' || !node.data?.estree) continue;

      sync.program(node.data.estree, context);
    }

    return sync.getExports();
  }

  return {
    async compile<V>(page: RawPage<V>): Promise<PageRenderer> {
      const cacheKey = stableHash({ path: page.absolutePath, value: page.content, compiler });
      let promise = cache.get(cacheKey);
      if (!promise) {
        promise = compiler.compile({ path: page.absolutePath, value: page.content });
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
        async render(components?: Components) {
          const executor = getExecutor({ jsx: JsxRuntime });
          const context: Record<string, unknown> = { ...components };
          const exports = getExports(compiled.tree, executor, context);

          const toc = compiled.file.data.rehypeToc?.map(
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
          );

          return {
            toc,
            body: render(compiled.tree, compiled.file, executor, components, context),
            exports,
          };
        },
      };
    },
  };
}
