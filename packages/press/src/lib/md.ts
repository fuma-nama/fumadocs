import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import {
  type Components,
  type Options as RenderOptions,
  toJsxRuntime,
} from 'hast-util-to-jsx-runtime';
import type { Root } from 'hast';
import * as JsxRuntime from 'react/jsx-runtime';
import type { Pluggable, PluggableList, Plugin } from 'unified';
import type { ReactNode } from 'react';

export interface MarkdownCompilerOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;
}

export interface CompileResult {
  tree: Root;
  file: VFile;
  render: (components?: Components) => ReactNode;
}

export interface MarkdownCompiler {
  compile: (input: Compatible) => Promise<CompileResult>;

  render: (tree: Root, file: VFile, components?: Components) => ReactNode;
}

export function createMarkdownCompiler({
  rehypePlugins = [],
  remarkPlugins = [],
  remarkRehypeOptions,
}: MarkdownCompilerOptions = {}): MarkdownCompiler {
  const processor = remark()
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins);

  function renderOptions(override?: Partial<RenderOptions>): RenderOptions {
    return {
      development: false,
      createEvaluater() {
        return {
          evaluateProgram() {
            throw new Error('Program is not allowed');
          },
          evaluateExpression(node) {
            if (node.type === 'Identifier') return override?.components?.[node.name];
            throw new Error(`${node.type} node is not allowed`);
          },
        };
      },
      ...JsxRuntime,
      ...override,
    };
  }

  return {
    async compile(input) {
      const file = new VFile(input);
      const tree = await processor.run(processor.parse(file), file);
      return {
        tree,
        file,
        render(components) {
          return toJsxRuntime(
            tree,
            renderOptions({
              filePath: file.path,
              components,
            }),
          );
        },
      };
    },
    render(tree, file, components) {
      return toJsxRuntime(
        tree,
        renderOptions({
          filePath: file.path,
          components,
        }),
      );
    },
  };
}

export function plugin<
  PluginParameters extends unknown[],
  Input extends string | import('unist').Node | undefined,
  Output,
>(plugin: Plugin<PluginParameters, Input, Output>, ...params: NoInfer<PluginParameters>) {
  return [plugin, ...params] as Pluggable;
}
