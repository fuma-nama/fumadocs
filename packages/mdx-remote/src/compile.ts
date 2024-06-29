import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
} from 'fumadocs-core/mdx-plugins';
import type { CompileOptions } from '@mdx-js/mdx';
import rehypeImgSize, {
  type Options as RehypeImgSizeOptions,
} from 'rehype-img-size';
import type { MDXComponents } from 'mdx/types';
import { processMDX, type CompileMDXResult } from '@/processor';
import { pluginOption, type ResolvePlugins } from './utils';

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
  mdxOptions?: MDXOptions;
  components?: MDXComponents;
  scope?: object;
}

export async function compileMDX<Frontmatter extends Record<string, unknown>>(
  options: CompileMDXOptions,
): Promise<CompileMDXResult<Frontmatter>> {
  const { mdxOptions = {} } = options;

  return processMDX<Frontmatter>(
    options.source,
    {
      ...mdxOptions,
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
            rehypeImgSize,
            {
              dir: mdxOptions.imageDir ?? './public',
            } satisfies RehypeImgSizeOptions,
            ...v,
          ],
        ],
        mdxOptions.rehypePlugins,
      ),
    },
    options.scope,
    options.components,
  );
}
