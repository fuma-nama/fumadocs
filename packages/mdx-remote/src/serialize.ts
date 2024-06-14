import { compile, type CompileOptions } from '@mdx-js/mdx';
import type { VFile } from 'vfile';
import type React from 'react';
import type { TableOfContents } from 'fumadocs-core/server';
import matter from 'gray-matter';
import { type MDXComponents } from 'mdx/types';
import { renderMDX } from '@/render';

export interface CompileMDXResult<TFrontmatter = Record<string, unknown>> {
  content: React.ReactElement;
  frontmatter: TFrontmatter;
  toc: TableOfContents;
  vfile: VFile;
  scope: object;
}

function getCompileOptions(mdxOptions: CompileOptions = {}): CompileOptions {
  return {
    development: process.env.NODE_ENV !== 'production',
    ...mdxOptions,
    outputFormat: 'function-body',
  };
}

export async function compileMDX<TFrontmatter = Record<string, unknown>>(
  source: string,
  options: CompileOptions,
  scope: object = {},
  components?: MDXComponents,
): Promise<CompileMDXResult<TFrontmatter>> {
  const { data: frontmatter, content } = matter(source);
  const file = await compile({ value: content }, getCompileOptions(options));
  const compiled = String(file);

  return {
    vfile: file,
    content: await renderMDX(compiled, scope, components),
    frontmatter: frontmatter as TFrontmatter,
    toc: file.data.toc as TableOfContents,
    scope,
  };
}
