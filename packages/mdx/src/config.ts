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
  type RemarkHeadingOptions,
} from 'fumadocs-core/mdx-plugins';
import type { Pluggable } from 'unified';
import type { Configuration } from 'webpack';
import { MapWebpackPlugin } from './webpack-plugins/map-plugin';
import remarkMdxExport from './mdx-plugins/remark-exports';
import type { LoaderOptions } from './loader';
import type { Options as MDXLoaderOptions } from './loader-mdx';
import {
  SearchIndexPlugin,
  type Options as SearchIndexPluginOptions,
} from './webpack-plugins/search-index-plugin';

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

  remarkHeadingOptions?: RemarkHeadingOptions;
  remarkImageOptions?: RemarkImageOptions | false;
  rehypeCodeOptions?: RehypeCodeOptions | false;
};

type ResolvePlugins = Pluggable[] | ((v: Pluggable[]) => Pluggable[]);

export interface CreateMDXOptions {
  cwd?: string;

  mdxOptions?: MDXOptions;

  buildSearchIndex?:
    | Omit<SearchIndexPluginOptions, 'rootContentDir' | 'rootMapFile'>
    | boolean;

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

  /**
   * {@link LoaderOptions.include}
   */
  include?: string | string[];
}

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

function getMDXLoaderOptions({
  valueToExport = [],
  rehypeCodeOptions,
  remarkImageOptions,
  remarkHeadingOptions,
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

const createMDX =
  ({
    mdxOptions = {},
    cwd = process.cwd(),
    rootMapPath = './.map.ts',
    rootContentPath = './content',
    buildSearchIndex = false,
    ...loadOptions
  }: CreateMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const rootMapFile = path.resolve(cwd, rootMapPath);
    const rootContentDir = path.resolve(cwd, rootContentPath);
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
              test: rootMapFile,
              use: {
                loader: 'fumadocs-mdx/loader',
                options: {
                  rootContentDir,
                  rootMapFile,
                  ...loadOptions,
                } satisfies LoaderOptions,
              },
            },
          );

          config.plugins ||= [];

          config.plugins.push(
            new MapWebpackPlugin({
              rootMapFile,
            }),
          );

          if (buildSearchIndex !== false)
            config.plugins.push(
              new SearchIndexPlugin({
                rootContentDir,
                rootMapFile,
                ...(typeof buildSearchIndex === 'object'
                  ? buildSearchIndex
                  : {}),
              }),
            );

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
          return nextConfig.webpack?.(config, options) ?? config;
        },
      } satisfies NextConfig),
    };
  };

export { createMDX as default };
