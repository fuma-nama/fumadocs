import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
  remarkImage,
  type RemarkImageOptions,
} from 'fumadocs-core/mdx-plugins';
import type { CompileOptions } from '@mdx-js/mdx';
import type { MDXComponents } from 'mdx/types';
import { parseFrontmatter, pluginOption, type ResolvePlugins } from './utils';
import { compile } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import type { ReactNode } from 'react';
import type { TableOfContents } from 'fumadocs-core/server';
import { renderMDX, type MdxContent } from '@/render';

export type MDXOptions = Omit<
  CompileOptions,
  'remarkPlugins' | 'rehypePlugins'
> & {
  remarkPlugins?: ResolvePlugins;
  rehypePlugins?: ResolvePlugins;

  remarkHeadingOptions?: RemarkHeadingOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;

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

export async function compileMDX<
  Frontmatter extends object = Record<string, unknown>,
>(options: CompileMDXOptions): Promise<CompileMDXResult<Frontmatter>> {
  const { scope = {}, skipRender } = options;
  const { frontmatter, content } = parseFrontmatter(options.source);

  const file = await compile(
    { value: content, path: options.filePath },
    getCompileOptions(options.mdxOptions),
  );
  const compiled = String(file);
  const MdxContent = !skipRender ? await renderMDX(compiled, scope) : null;

  return {
    vfile: file,
    compiled,
    get content() {
      return MdxContent?.({ components: options.components }) as ReactNode;
    },
    frontmatter: frontmatter as Frontmatter,
    body: (props) => {
      if (!MdxContent)
        throw new Error(
          'Body cannot be rendered when `skipRender` is set to true',
        );

      return MdxContent({
        components: { ...options.components, ...props.components },
      });
    },
    toc: file.data.toc as TableOfContents,
    scope,
  };
}

function getCompileOptions(mdxOptions: MDXOptions = {}): CompileOptions {
  return {
    development: process.env.NODE_ENV !== 'production',
    ...mdxOptions,
    outputFormat: 'function-body',
    remarkPlugins: pluginOption(
      (v) => [
        remarkGfm,
        mdxOptions.remarkHeadingOptions !== false && [
          remarkHeading,
          mdxOptions.remarkHeadingOptions,
        ],
        ...v,
      ],
      mdxOptions.remarkPlugins,
    ),
    rehypePlugins: pluginOption(
      (v) => [
        mdxOptions.rehypeCodeOptions !== false && [
          rehypeCode,
          mdxOptions.rehypeCodeOptions,
        ],
        mdxOptions.remarkImageOptions !== false && [
          remarkImage,
          {
            useImport: false,
            publicDir: mdxOptions.imageDir ?? './public',
            ...mdxOptions.remarkImageOptions,
          } satisfies RemarkImageOptions,
        ],
        ...v,
      ],
      mdxOptions.rehypePlugins,
    ),
  };
}
