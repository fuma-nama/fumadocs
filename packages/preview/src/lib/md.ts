import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import { type Components, toJsx } from 'fumadocs-core/utils/hast-to-jsx';
import type { Root } from 'hast';
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
  render: (components?: Partial<Components>) => ReactNode;
}

export interface MarkdownCompiler {
  compile: (input: Compatible) => Promise<CompileResult>;

  render: (tree: Root, components?: Partial<Components>) => ReactNode;
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

  function render(tree: Root, components?: Partial<Components>): ReactNode {
    return toJsx(tree, {
      components,
      evaluator: {
        evaluateProgram() {
          throw new Error('Program is not allowed');
        },
        evaluateExpression(node) {
          if (node.type === 'Identifier') return components?.[node.name as keyof Components];
          throw new Error(`${node.type} node is not allowed`);
        },
      },
    });
  }

  return {
    async compile(input) {
      const file = new VFile(input);
      const tree = await processor.run(processor.parse(file), file);
      return {
        tree,
        file,
        render: (components) => render(tree, components),
      };
    },
    render,
  };
}

export function plugin<
  PluginParameters extends unknown[],
  Input extends string | import('unist').Node | undefined,
  Output,
>(plugin: Plugin<PluginParameters, Input, Output>, ...params: NoInfer<PluginParameters>) {
  return [plugin, ...params] as Pluggable;
}
