import {
  rehypeCode,
  type RehypeCodeOptions,
  remarkGfm,
  remarkHeading,
  type RemarkHeadingOptions,
  remarkImage,
  type RemarkImageOptions,
  remarkStructure,
  type StructureOptions,
} from 'fumadocs-core/mdx-plugins';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { Pluggable } from 'unified';
import remarkMdxExport from '@/mdx-plugins/remark-exports';

type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export type DefaultMDXOptions = Omit<
  NonNullable<ProcessorOptions>,
  'rehypePlugins' | 'remarkPlugins' | '_ctx'
> & {
  rehypePlugins?: ResolvePlugins;
  remarkPlugins?: ResolvePlugins;

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  remarkStructureOptions?: StructureOptions | false;
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
  remarkStructureOptions,
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
      remarkStructureOptions !== false && [
        remarkStructure,
        remarkStructureOptions,
      ],
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
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}
