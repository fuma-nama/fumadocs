import { remarkGfm } from 'fumadocs-core/mdx-plugins/remark-gfm';
import { plugin, plugins } from './utils';
import { remarkHeading, type RemarkHeadingOptions } from 'fumadocs-core/mdx-plugins/remark-heading';
import { remarkNpm, type RemarkNpmOptions } from 'fumadocs-core/mdx-plugins/remark-npm';
import {
  remarkCodeTab,
  type RemarkCodeTabOptions,
} from 'fumadocs-core/mdx-plugins/remark-code-tab';
import { rehypeCode, type RehypeCodeOptions } from 'fumadocs-core/mdx-plugins/rehype-code';
import { rehypeToc, type RehypeTocOptions } from 'fumadocs-core/mdx-plugins/rehype-toc';
import { remarkStructure, type StructureOptions } from 'fumadocs-core/mdx-plugins/remark-structure';
import { Compatible, VFile } from 'vfile';
import type { Root } from 'hast';
import * as Mdx from '@mdx-js/mdx';
import { remark } from 'remark';
import type { PluggableList } from 'unified';
import remarkRehype, { type Options as RemarkRehypeOptions } from 'remark-rehype';

export interface MarkdownCompilerOptions {
  mdOptions?: MarkdownProcessorOptions;
  mdxOptions?: MDXProcessorOptions;
}

export interface MarkdownProcessorOptions {
  remarkPlugins?: PluggableList;
  rehypePlugins?: PluggableList;
  remarkRehypeOptions?: RemarkRehypeOptions;

  remarkStructureOptions?: StructureOptions | false;
  remarkHeadingOptions?: RemarkHeadingOptions | false;
  remarkCodeTabOptions?: RemarkCodeTabOptions | false;
  remarkNpmOptions?: RemarkNpmOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;
}

export interface MDXProcessorOptions extends Mdx.ProcessorOptions {
  remarkStructureOptions?: StructureOptions | false;
  remarkHeadingOptions?: RemarkHeadingOptions | false;
  remarkCodeTabOptions?: RemarkCodeTabOptions | false;
  remarkNpmOptions?: RemarkNpmOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;
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
    const {
      remarkHeadingOptions,
      rehypeCodeOptions,
      rehypePlugins,
      rehypeTocOptions,
      remarkCodeTabOptions,
      remarkNpmOptions,
      remarkPlugins,
      remarkRehypeOptions,
      remarkStructureOptions,
    } = options?.mdOptions ?? {};

    return remark()
      .use(
        plugins(
          remarkGfm,
          remarkHeadingOptions !== false &&
            plugin(remarkHeading, { generateToc: false, ...remarkHeadingOptions }),
          remarkNpmOptions !== false && plugin(remarkNpm, remarkNpmOptions),
          remarkCodeTabOptions !== false && plugin(remarkCodeTab, remarkCodeTabOptions),
          ...(remarkPlugins ?? []),
          remarkStructureOptions !== false && plugin(remarkStructure, remarkStructureOptions),
        ),
      )
      .use(remarkRehype, {
        passThrough: ['mdxJsxFlowElement', 'mdxJsxTextElement'],
        ...remarkRehypeOptions,
      })
      .use(
        plugins(
          rehypeCodeOptions !== false && plugin(rehypeCode, rehypeCodeOptions),
          ...(rehypePlugins ?? []),
          rehypeTocOptions !== false &&
            plugin(rehypeToc, { exportToc: { as: 'data' }, ...rehypeTocOptions }),
        ),
      );
  }

  function createMdxCompiler() {
    const {
      remarkCodeTabOptions,
      remarkHeadingOptions,
      remarkNpmOptions,
      remarkStructureOptions,
      rehypeCodeOptions,
      rehypeTocOptions,
      remarkPlugins,
      rehypePlugins,
      ...mdxOptions
    } = options?.mdxOptions ?? {};

    return Mdx.createProcessor({
      ...mdxOptions,
      outputFormat: 'function-body',
      development: false,
      remarkPlugins: plugins(
        remarkGfm,
        remarkCodeTabOptions !== false &&
          plugin(remarkHeading, { generateToc: false, ...remarkCodeTabOptions }),
        remarkNpmOptions !== false && plugin(remarkNpm, remarkNpmOptions),
        remarkCodeTabOptions !== false && plugin(remarkCodeTab, remarkCodeTabOptions),
        ...(remarkPlugins ?? []),
        remarkStructureOptions !== false && plugin(remarkStructure, remarkStructureOptions),
      ),
      rehypePlugins: plugins(
        rehypeCodeOptions !== false && plugin(rehypeCode, rehypeCodeOptions),
        ...(rehypePlugins ?? []),
        rehypeTocOptions !== false &&
          plugin(rehypeToc, { exportToc: { as: 'esm', name: 'toc' }, ...rehypeTocOptions }),
      ),
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
