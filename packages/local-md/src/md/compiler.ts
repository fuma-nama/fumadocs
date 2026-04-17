import { remark } from 'remark';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';
import { type Compatible, VFile } from 'vfile';
import type { Root } from 'hast';
import type { Pluggable, PluggableList, Plugin } from 'unified';

export interface BaseCompilerOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;
}

export interface CompileResult {
  tree: Root;
  file: VFile;
}

export interface BaseCompiler {
  compile: (input: Compatible) => Promise<CompileResult>;
}

export function createBaseCompiler({
  rehypePlugins = [],
  remarkPlugins = [],
  remarkRehypeOptions,
}: BaseCompilerOptions = {}): BaseCompiler {
  const processor = remark()
    .use(remarkPlugins)
    .use(remarkRehype, remarkRehypeOptions)
    .use(rehypePlugins);

  return {
    async compile(input) {
      // inherit vfile
      const file = input instanceof VFile ? input : new VFile(input);
      const tree = await processor.run(processor.parse(file), file);
      return {
        tree,
        file,
      };
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

export function plugins(...plugins: (Pluggable | false | null | undefined)[]): Pluggable[] {
  return plugins.filter((v) => v !== false && v != null);
}
