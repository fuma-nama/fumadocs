import {
  rehypeCode,
  type RehypeCodeOptions,
  rehypeToc,
  RehypeTocOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
  remarkImage,
  type RemarkImageOptions,
} from 'fumadocs-core/mdx-plugins';
import { type CompileOptions, createProcessor } from '@mdx-js/mdx';
import type { MDXComponents } from 'mdx/types';
import { parseFrontmatter, pluginOption, type ResolvePlugins } from './utils';
import type { VFile } from 'vfile';
import type { ReactNode } from 'react';
import type { TableOfContents } from 'fumadocs-core/server';
import { executeMdx, type MdxContent } from '@/render';

export type MDXOptions = Omit<
  CompileOptions,
  'remarkPlugins' | 'rehypePlugins'
> & {
  remarkPlugins?: ResolvePlugins;
  rehypePlugins?: ResolvePlugins;

  remarkHeadingOptions?: RemarkHeadingOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
  rehypeTocOptions?: RehypeTocOptions | false;

  /**
   * The directory to find image sizes
   *
   * @defaultValue './public'
   */
  imageDir?: string;

  remarkImageOptions?: RemarkImageOptions | false;
};

export interface CompileMDXOptions {
  source: string;
  /**
   * File path of source content
   */
  filePath?: string;

  mdxOptions?: MDXOptions;
  components?: MDXComponents;
  scope?: object;

  skipRender?: boolean;
}

export interface CompileMDXResult<TFrontmatter = Record<string, unknown>> {
  /**
   * @deprecated use `body` instead
   */
  get content(): ReactNode;

  body: MdxContent;
  compiled: string;
  frontmatter: TFrontmatter;
  toc: TableOfContents;
  vfile: VFile;
  scope: object;
}

export function createCompiler(mdxOptions?: MDXOptions) {
  let format = mdxOptions?.format;
  if (!format || format === 'detect') format = 'mdx';

  const processor = createProcessor({
    ...getCompileOptions(mdxOptions),
    format,
  });

  return {
    async compile<Frontmatter extends object = Record<string, unknown>>(
      options: Omit<CompileMDXOptions, 'mdxOptions'>,
    ): Promise<CompileMDXResult<Frontmatter>> {
      const { scope = {}, skipRender } = options;
      const { frontmatter, content } = parseFrontmatter(options.source);

      const file = await processor.process({
        value: content,
        path: options.filePath,
      });
      const compiled = String(file);
      const exports = !skipRender ? await executeMdx(compiled, scope) : null;

      return {
        vfile: file,
        compiled,
        get content() {
          if (!exports)
            throw new Error(
              'Body cannot be rendered when `skipRender` is set to true',
            );

          return exports.default({
            components: options.components,
          }) as ReactNode;
        },
        frontmatter: frontmatter as Frontmatter,
        body: (props) => {
          if (!exports)
            throw new Error(
              'Body cannot be rendered when `skipRender` is set to true',
            );

          return exports.default({
            components: { ...options.components, ...props.components },
          });
        },
        toc: exports?.toc ?? (file.data.toc as TableOfContents),
        scope,
      };
    },
  };
}

export async function compileMDX<
  Frontmatter extends object = Record<string, unknown>,
>(options: CompileMDXOptions): Promise<CompileMDXResult<Frontmatter>> {
  const compiler = createCompiler(options.mdxOptions);

  return compiler.compile(options);
}

function getCompileOptions({
  rehypeCodeOptions,
  remarkImageOptions,
  rehypeTocOptions,
  remarkHeadingOptions,
  imageDir = './public',
  ...options
}: MDXOptions = {}): CompileOptions {
  return {
    development: process.env.NODE_ENV === 'development',
    ...options,
    outputFormat: 'function-body',
    remarkPlugins: pluginOption(
      (v) => [
        remarkGfm,
        remarkHeadingOptions !== false && [remarkHeading, remarkHeadingOptions],
        ...v,
      ],
      options.remarkPlugins,
    ),
    rehypePlugins: pluginOption(
      (v) => [
        rehypeCodeOptions !== false && [rehypeCode, rehypeCodeOptions],
        rehypeTocOptions !== false && [rehypeToc, rehypeTocOptions],
        remarkImageOptions !== false && [
          remarkImage,
          {
            useImport: false,
            publicDir: imageDir,
            ...remarkImageOptions,
          } satisfies RemarkImageOptions,
        ],
        ...v,
      ],
      options.rehypePlugins,
    ),
  };
}
