import path from 'node:path';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { MapWebpackPlugin } from '@/webpack-plugins/map-plugin';
import type { LoaderOptions } from '@/loader';
import { findConfigFile } from '@/config/load';
import {
  type DefaultMDXOptions,
  getDefaultMDXOptions,
} from '@/utils/mdx-options';
import type { Options as MDXLoaderOptions } from '../loader-mdx';
import {
  SearchIndexPlugin,
  type Options as SearchIndexPluginOptions,
} from '../webpack-plugins/search-index-plugin';

export interface CreateMDXOptions {
  cwd?: string;

  mdxOptions?: DefaultMDXOptions;

  buildSearchIndex?:
    | Omit<SearchIndexPluginOptions, 'rootContentDir' | 'rootMapFile'>
    | boolean;

  /**
   * Where the root map.ts should be, relative to cwd
   *
   * @defaultValue `'./.source/index.ts'`
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

  /**
   * Path to source configuration file
   */
  configPath?: string;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export function createMDX({
  mdxOptions = {},
  cwd = process.cwd(),
  rootMapPath = '.source/index.ts',
  rootContentPath = './content',
  buildSearchIndex = false,
  configPath = findConfigFile(),
  ...loadOptions
}: CreateMDXOptions = {}) {
  const rootMapFile = path.resolve(cwd, rootMapPath);
  const rootContentDir = path.resolve(cwd, rootContentPath);
  const mdxLoaderOptions = getDefaultMDXOptions(mdxOptions);

  return (nextConfig: NextConfig = {}): NextConfig => {
    return {
      ...nextConfig,
      pageExtensions: nextConfig.pageExtensions ?? defaultPageExtensions,
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
                  ...mdxLoaderOptions,
                  _ctx: {
                    configPath,
                  },
                } satisfies MDXLoaderOptions,
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
                configPath,
                ...loadOptions,
              } satisfies LoaderOptions,
            },
          },
        );

        config.plugins ||= [];

        config.plugins.push(
          new MapWebpackPlugin({
            rootMapFile,
            configPath,
          }),
        );

        if (buildSearchIndex !== false)
          config.plugins.push(
            new SearchIndexPlugin({
              rootContentDir,
              rootMapFile,
              ...(typeof buildSearchIndex === 'object' ? buildSearchIndex : {}),
            }),
          );

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}
