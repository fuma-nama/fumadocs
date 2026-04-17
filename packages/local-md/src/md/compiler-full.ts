import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { createBaseCompiler, BaseCompilerOptions, plugin, BaseCompiler, plugins } from './compiler';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkNpm } from 'fumadocs-core/mdx-plugins/remark-npm';
import { remarkCodeTab } from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc } from 'fumadocs-core/mdx-plugins/rehype-toc';
import { remarkStructure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { VFile } from 'vfile';
import remarkMdx from 'remark-mdx';

export type MarkdownCompilerOptions = BaseCompilerOptions;
export type MarkdownCompiler = BaseCompiler;

export function createMarkdownCompiler(options?: MarkdownCompilerOptions): MarkdownCompiler {
  const compilers = new Map<'md' | 'mdx', BaseCompiler>();

  function createCompiler(preset: 'md' | 'mdx') {
    return createBaseCompiler({
      ...options,
      remarkPlugins: plugins(
        remarkGfm,
        preset === 'mdx' && remarkMdx,
        plugin(remarkHeading, { generateToc: false }),
        plugin(remarkNpm, { persist: { id: 'package-manager' } }),
        remarkCodeTab,
        remarkStructure,
        ...(options?.remarkPlugins ?? []),
      ),
      remarkRehypeOptions: {
        passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
        ...options?.remarkRehypeOptions,
      },
      rehypePlugins: [
        plugin(rehypeCode, { lazy: true, fallbackLanguage: 'text' }),
        plugin(rehypeToc, { exportToc: { as: 'data' } }),
        ...(options?.rehypePlugins ?? []),
      ],
    });
  }

  return {
    compile(input) {
      const file = new VFile(input);
      const format = file.extname === '.mdx' ? 'mdx' : 'md';
      let compiler = compilers.get(format);
      if (!compiler) {
        compiler = createCompiler(format);
        compilers.set(format, compiler);
      }

      return compiler.compile(file);
    },
  };
}
