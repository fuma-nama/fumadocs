import * as plugins from 'fumadocs-core/mdx-plugins';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { Pluggable } from 'unified';
import remarkMdxExport from '@/mdx-plugins/remark-exports';
import type { LoadedConfig } from '@/utils/config';

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
  remarkNpmOptions?: plugins.RemarkNpmOptions | false;
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
  remarkNpmOptions,
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
      'remarkCodeTab' in plugins &&
        remarkCodeTabOptions !== false && [
          plugins.remarkCodeTab,
          remarkCodeTabOptions,
        ],
      'remarkNpm' in plugins &&
        remarkNpmOptions !== false && [plugins.remarkNpm, remarkNpmOptions],
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

export async function loadDefaultOptions(
  config: LoadedConfig,
): Promise<ProcessorOptions> {
  const input = config.global?.mdxOptions;
  config._mdx_loader ??= {};

  const mdxLoader = config._mdx_loader;
  if (!mdxLoader.cachedOptions) {
    mdxLoader.cachedOptions =
      typeof input === 'function'
        ? getDefaultMDXOptions(await input())
        : getDefaultMDXOptions(input ?? {});
  }

  return mdxLoader.cachedOptions;
}
