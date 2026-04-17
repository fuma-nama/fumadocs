import type { CompileResult, BaseCompiler } from './compiler';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { ReactNode } from 'react';
import { stableHash } from 'stable-hash';
import { RawPage } from '@/storage';
import * as JsxRuntime from 'react/jsx-runtime';
// @ts-expect-error -- untyped
import { evaluate } from 'eval-estree-expression';
import { type Components, toJsxRuntime } from 'hast-util-to-jsx-runtime';
import { Root } from 'hast';
import { VFile } from 'vfile';

export interface PageRenderer {
  structuredData: StructuredData;
  render: () => {
    toc?: TOCItemType[];
    body: ReactNode;
  };
}

export function createMarkdownRenderer(compiler: BaseCompiler) {
  const cache = new Map<string, Promise<CompileResult>>();

  function render(tree: Root, file: VFile, components?: Components) {
    return toJsxRuntime(tree, {
      filePath: file.path,
      components,
      development: false,
      createEvaluater() {
        return {
          evaluateProgram(program) {
            return evaluate.sync(program, { ...components }, { functions: true });
          },
          evaluateExpression(node) {
            return evaluate.sync(node, { ...components }, { functions: true });
          },
        };
      },
      ...JsxRuntime,
    });
  }

  return {
    render,
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
        render(mdxComponents?: Components) {
          const toc = compiled.file.data.rehypeToc?.map(
            (item): TOCItemType => ({
              ...item,
              title: render(
                {
                  type: 'root',
                  children: item.title.children,
                },
                compiled.file,
                mdxComponents,
              ),
            }),
          );

          const body = render(compiled.tree, compiled.file, mdxComponents);

          return { toc, body };
        },
      };
    },
  };
}
