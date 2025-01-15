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
import { pluginOption, type ResolvePlugins } from './utils';
import { compile } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import type React from 'react';
import type { TableOfContents } from 'fumadocs-core/server';
import matter from 'gray-matter';
import { renderMDX } from '@/render';

export type MDXOptions = Omit<
  CompileOptions,
  'remarkPlugins' | 'rehypePlugins'
> & {
  remarkPlugins?: ResolvePlugins;
  rehypePlugins?: ResolvePlugins;

  remarkHeadingOptions?: RemarkHeadingOptions;
  rehypeCodeOptions?: RehypeCodeOptions | false;

  /**
   * The directory to find image sizes
   *
   * @defaultValue './public'
   */
  imageDir?: string;
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
}

export interface CompileMDXResult<TFrontmatter = Record<string, unknown>> {
  content: React.ReactElement;
  compiled: string;
  frontmatter: TFrontmatter;
  toc: TableOfContents;
  vfile: VFile;
  scope: object;
}

export async function compileMDX<Frontmatter extends Record<string, unknown>>(
  options: CompileMDXOptions,
): Promise<CompileMDXResult<Frontmatter>> {
  const { scope = {} } = options;
  const { data: frontmatter, content } = matter(options.source);

  const file = await compile(
    { value: content, path: options.filePath },
    getCompileOptions(options.mdxOptions),
  );
  const compiled = String(file);

  return {
    vfile: file,
    compiled,
    content: await renderMDX(compiled, scope, options.components),
    frontmatter: frontmatter as Frontmatter,
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
        [remarkHeading, mdxOptions.remarkHeadingOptions],
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
        [
          remarkImage,
          {
            useImport: false,
            publicDir: mdxOptions.imageDir ?? './public',
          } satisfies RemarkImageOptions,
        ],
        ...v,
      ],
      mdxOptions.rehypePlugins,
    ),
  };
}
