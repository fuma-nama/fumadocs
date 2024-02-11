import path from 'node:path';
import type { NextConfig } from 'next';
import {
  rehypeCode,
  remarkGfm,
  remarkStructure,
  remarkHeading,
  type RehypeCodeOptions,
  remarkImage,
  type RemarkImageOptions,
} from 'fumadocs-core/mdx-plugins';
import type { Pluggable, PluggableList } from 'unified';
import type { Configuration } from 'webpack';
import { MapWebpackPlugin } from './webpack-plugins/map-plugin';
import remarkMdxExport from './mdx-plugins/remark-exports';
import type { LoaderOptions } from './loader';
import type { Options as MDXLoaderOptions } from './loader-mdx';

type MDXOptions = Omit<
  NonNullable<MDXLoaderOptions>,
  'rehypePlugins' | 'remarkPlugins'
> & {
  rehypePlugins?: ResolvePlugins;
  remarkPlugins?: ResolvePlugins;

  /**
   * Properties to export from `vfile.data`
   */
  valueToExport?: string[];

  remarkImageOptions?: RemarkImageOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
};

type ResolvePlugins = PluggableList | ((v: PluggableList) => PluggableList);

export interface CreateMDXOptions {
  cwd?: string;

  mdxOptions?: MDXOptions;

  /**
   * Where the root map.ts should be, relative to cwd
   *
   * @defaultValue `'./.map.ts'`
   */
  rootMapPath?: string;

  /**
   * Where the content directory should be, relative to cwd
   *
   * @defaultValue `'./content'`
   */
  rootContentPath?: string;
}

function pluginOption(
  def: (v: PluggableList) => PluggableList,
  options: ResolvePlugins = [],
): PluggableList {
  const list = def(Array.isArray(options) ? options : []);

  if (typeof options === 'function') {
    return options(list);
  }

  return list;
}

function getMDXLoaderOptions({
  valueToExport = [],
  rehypeCodeOptions,
  remarkImageOptions,
  ...mdxOptions
}: MDXOptions): MDXLoaderOptions {
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
      remarkHeading,
      ...(remarkImageOptions === false
        ? []
        : [[remarkImage, remarkImageOptions] satisfies Pluggable]),
      ...v,
      remarkStructure,
      [remarkMdxExport, { values: mdxExports }],
    ],
    mdxOptions.remarkPlugins,
  );

  const rehypePlugins: PluggableList = pluginOption(
    (v) => [
      ...(rehypeCodeOptions === false
        ? []
        : [[rehypeCode, rehypeCodeOptions] satisfies Pluggable]),
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

const createMDX =
  ({
    mdxOptions = {},
    cwd = process.cwd(),
    rootMapPath = './.map.ts',
    rootContentPath = './content',
  }: CreateMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const _mapPath = path.resolve(cwd, rootMapPath);
    const mdxLoaderOptions = getMDXLoaderOptions(mdxOptions);

    return {
      ...nextConfig,
      ...({
        webpack: (config: Configuration, options) => {
          config.resolve ||= {};

          const alias = config.resolve.alias as Record<string, unknown>;

          alias['next-mdx-import-source-file'] = [
            'private-next-root-dir/src/mdx-components',
            'private-next-root-dir/mdx-components',
            '@mdx-js/react',
          ];

          config.module ||= {};
          config.module.rules ||= [];

          config.module.rules.push(
            {
              test: /\.mdx?$/,
              use: [
                options.defaultLoaders.babel,
                {
                  loader: 'fumadocs-mdx/loader-mdx',
                  options: mdxLoaderOptions,
                },
              ],
            },
            {
              test: _mapPath,
              use: {
                loader: 'fumadocs-mdx/loader',
                options: {
                  cwd,
                  rootContentPath,
                  mapPath: _mapPath,
                } satisfies LoaderOptions,
              },
            },
          );

          config.plugins ||= [];

          config.plugins.push(new MapWebpackPlugin({ rootMapFile: _mapPath }));

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
          return nextConfig.webpack?.(config, options) ?? config;
        },
      } satisfies NextConfig),
    };
  };

export { createMDX as default };
