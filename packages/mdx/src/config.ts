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
import type { PluggableList } from 'unified';
import type { Configuration } from 'webpack';
import { NextDocsWebpackPlugin } from './webpack-plugins/next-docs';
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

  remarkImageOptions?: RemarkImageOptions;
  rehypeCodeOptions?: RehypeCodeOptions;
};

type ResolvePlugins = PluggableList | ((v: PluggableList) => PluggableList);

interface NextDocsMDXOptions {
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

const createNextDocs =
  ({
    mdxOptions = {},
    cwd = process.cwd(),
    rootMapPath = './.map.ts',
    rootContentPath = './content',
  }: NextDocsMDXOptions = {}) =>
  (nextConfig: NextConfig = {}) => {
    const valueToExport = [
      'structuredData',
      'toc',
      'frontmatter',
      'lastModified',
      ...(mdxOptions.valueToExport ?? []),
    ];
    const _mapPath = path.resolve(cwd, rootMapPath);

    const remarkPlugins = pluginOption(
      (v) => [
        remarkGfm,
        remarkHeading,
        [remarkImage, mdxOptions.remarkImageOptions],
        ...v,
        remarkStructure,
        [remarkMdxExport, { values: valueToExport }],
      ],
      mdxOptions.remarkPlugins,
    );

    const rehypePlugins: PluggableList = pluginOption(
      (v) => [[rehypeCode, mdxOptions.rehypeCodeOptions], ...v],
      mdxOptions.rehypePlugins,
    );

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
                  options: {
                    providerImportSource: 'next-mdx-import-source-file',
                    ...mdxOptions,
                    remarkPlugins,
                    rehypePlugins,
                  } satisfies MDXLoaderOptions,
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

          config.plugins.push(
            new NextDocsWebpackPlugin({ rootMapFile: _mapPath }),
          );

          // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
          return nextConfig.webpack?.(config, options) ?? config;
        },
      } satisfies NextConfig),
    };
  };

export { createNextDocs as default };
