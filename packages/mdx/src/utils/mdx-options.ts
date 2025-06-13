import * as plugins from 'fumadocs-core/mdx-plugins';
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

  remarkStructureOptions?: plugins.StructureOptions | false;
  remarkHeadingOptions?: plugins.RemarkHeadingOptions;
  remarkImageOptions?: plugins.RemarkImageOptions | false;
  remarkCodeTabOptions?: plugins.RemarkCodeTabOptions | false;
  rehypeCodeOptions?: plugins.RehypeCodeOptions | false;
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
  remarkCodeTabOptions,
  ...mdxOptions
}: DefaultMDXOptions): ProcessorOptions {
  const mdxExports = [
    'structuredData',
    'frontmatter',
    'lastModified',
    ...valueToExport,
  ];

  const remarkPlugins = pluginOption(
    (v) => [
      plugins.remarkGfm,
      [
        plugins.remarkHeading,
        {
          generateToc: false,
          ...remarkHeadingOptions,
        },
      ],
      remarkImageOptions !== false && [plugins.remarkImage, remarkImageOptions],
      // Fumadocs 14 compatibility
      'remarkCodeTab' in plugins &&
        remarkCodeTabOptions !== false && [
          plugins.remarkCodeTab,
          remarkCodeTabOptions,
        ],
      ...v,
      remarkStructureOptions !== false && [
        plugins.remarkStructure,
        remarkStructureOptions,
      ],
      [remarkMdxExport, { values: mdxExports }],
    ],
    mdxOptions.remarkPlugins,
  );

  const rehypePlugins = pluginOption(
    (v) => [
      rehypeCodeOptions !== false && [plugins.rehypeCode, rehypeCodeOptions],
      ...v,
      plugins.rehypeToc,
    ],
    mdxOptions.rehypePlugins,
  );

  return {
    ...mdxOptions,
    remarkPlugins,
    rehypePlugins,
  };
}
