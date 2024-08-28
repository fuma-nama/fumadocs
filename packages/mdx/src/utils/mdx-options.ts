import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
  remarkImage,
  type RemarkImageOptions,
  remarkStructure,
} from 'fumadocs-core/mdx-plugins';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { Pluggable } from 'unified';
import remarkMdxExport from '@/mdx-plugins/remark-exports';
import type { Options as MDXLoaderOptions } from '@/loader-mdx';

type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export type DefaultMDXOptions = Omit<
  NonNullable<MDXLoaderOptions>,
  'rehypePlugins' | 'remarkPlugins' | '_ctx'
> & {
  rehypePlugins?: ResolvePlugins;
  remarkPlugins?: ResolvePlugins;

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  remarkHeadingOptions?: RemarkHeadingOptions;
  remarkImageOptions?: RemarkImageOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
};

function pluginOption(
  def: (v: Pluggable[]) => (Pluggable | false)[],
  options: ResolvePlugins = [],
): Pluggable[] {
  const list = def(Array.isArray(options) ? options : []).filter(
    Boolean,
  ) as Pluggable[];

  if (typeof options === 'function') {
    return options(list);
  }

  return list;
}

export function getDefaultMDXOptions({
  valueToExport = [],
  rehypeCodeOptions,
  remarkImageOptions,
  remarkHeadingOptions,
  ...mdxOptions
}: DefaultMDXOptions): ProcessorOptions {
  const mdxExports = [
    'structuredData',
    'toc',
    'frontmatter',
    'lastModified',
    ...valueToExport,
  ];

  const remarkPlugins = pluginOption(
    (v) => [
      remarkGfm,
      [remarkHeading, remarkHeadingOptions],
      remarkImageOptions !== false && [remarkImage, remarkImageOptions],
      ...v,
      remarkStructure,
      [remarkMdxExport, { values: mdxExports }],
    ],
    mdxOptions.remarkPlugins,
  );

  const rehypePlugins = pluginOption(
    (v) => [
      rehypeCodeOptions !== false && [rehypeCode, rehypeCodeOptions],
      ...v,
    ],
    mdxOptions.rehypePlugins,
  );

  return {
    providerImportSource: 'next-mdx-import-source-file',
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}
