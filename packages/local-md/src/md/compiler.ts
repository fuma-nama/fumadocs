import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { plugin, plugins } from './utils';
import { remarkHeading } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkNpm } from 'fumadocs-core/mdx-plugins/remark-npm';
import { remarkCodeTab } from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { rehypeCode } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc } from 'fumadocs-core/mdx-plugins/rehype-toc';
import { remarkStructure } from 'fumadocs-core/mdx-plugins/remark-structure';
import { Compatible, VFile } from 'vfile';
import type { Root } from 'hast';
import * as Mdx from '@mdx-js/mdx';
import { remark } from 'remark';
import type { PluggableList } from 'unified';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';

export interface MarkdownCompilerOptions {
  mdOptions?: MarkdownProcessorOptions;
  mdxOptions?: Mdx.ProcessorOptions;
}

export interface MarkdownProcessorOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;
}

export interface MarkdownCompiler {
  compile: (input: Compatible) => Promise<CompileResult>;
}

export type CompileResult =
  | {
      type: 'ast';
      tree: Root;
      file: VFile;
    }
  | {
      type: 'js';
      file: VFile;
      code: string;
    };

export function createMarkdownCompiler(options?: MarkdownCompilerOptions): MarkdownCompiler {
  let mdx: ReturnType<typeof createMdxCompiler> | undefined;
  let md: ReturnType<typeof createMdCompiler> | undefined;

  function createMdCompiler() {
    const mdOptions = options?.mdOptions ?? {};
    return remark()
      .use(
        plugins(
          remarkGfm,
          plugin(remarkHeading, { generateToc: false }),
          plugin(remarkNpm, { persist: { id: 'package-manager' } }),
          remarkCodeTab,
          remarkStructure,
          ...(mdOptions.remarkPlugins ?? []),
        ),
      )
      .use(remarkRehype, {
        passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
        ...mdOptions.remarkRehypeOptions,
      })
      .use([
        plugin(rehypeCode, { lazy: true, fallbackLanguage: 'text' }),
        plugin(rehypeToc, { exportToc: { as: 'data' } }),
        ...(mdOptions.rehypePlugins ?? []),
      ]);
  }

  function createMdxCompiler() {
    const mdxOptions = options?.mdxOptions ?? {};

    return Mdx.createProcessor({
      ...mdxOptions,
      outputFormat: 'function-body',
      development: false,
      remarkPlugins: plugins(
        remarkGfm,
        plugin(remarkHeading, { generateToc: false }),
        plugin(remarkNpm, { persist: { id: 'package-manager' } }),
        remarkCodeTab,
        remarkStructure,
        ...(mdxOptions.remarkPlugins ?? []),
      ),
      rehypePlugins: [
        plugin(rehypeCode, { lazy: true, fallbackLanguage: 'text' }),
        plugin(rehypeToc, { exportToc: { as: 'esm', name: 'toc' } }),
        ...(mdxOptions.rehypePlugins ?? []),
      ],
    });
  }

  return {
    async compile(input) {
      const file = new VFile(input);
      if (file.extname === '.mdx') {
        mdx ??= createMdxCompiler();
        const out = await mdx.process(file);
        return {
          type: 'js',
          file,
          code: String(out.value),
        };
      }

      md ??= createMdCompiler();
      const tree = await md.run(md.parse(file), file);
      return {
        type: 'ast',
        tree,
        file,
      };
    },
  };
}
