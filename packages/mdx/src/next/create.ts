import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { findConfigFile } from '@/config/load';
import { start } from '@/map';
import { type Options as MDXLoaderOptions } from '../loader-mdx';
import { type Options as SearchIndexPluginOptions } from '../webpack-plugins/search-index-plugin';

export interface CreateMDXOptions {
  cwd?: string;

  buildSearchIndex?:
    | Omit<SearchIndexPluginOptions, 'rootContentDir' | 'rootMapFile'>
    | boolean;

  mdxOptions?: Omit<MDXLoaderOptions, '_ctx'>;

  /**
   * Path to source configuration file
   */
  configPath?: string;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export function createMDX({
  mdxOptions,
  configPath = findConfigFile(),
}: CreateMDXOptions = {}) {
  // Next.js performs multiple iteration on the `next.config.js` file
  // the first time contains the original arguments of `next dev`
  // we only execute on the first iteration
  const isDev = process.argv.includes('dev');
  const isBuild = process.argv.includes('build');

  if (isDev || isBuild) {
    void start(isDev, configPath, 'index');
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const mdxLoaderOptions: MDXLoaderOptions = {
      ...mdxOptions,
      _ctx: {
        configPath,
      },
    };

    return {
      ...nextConfig,
      experimental: {
        turbo: {
          // @ts-expect-error -- safe types
          rules: {
            '*.{md,mdx}': {
              loaders: [
                {
                  loader: 'fumadocs-mdx/loader-mdx',
                  options: mdxLoaderOptions,
                },
              ],
              as: '*.js',
            },
            ...nextConfig.experimental?.turbo?.rules,
          },
          ...nextConfig.experimental?.turbo,
        },
        ...nextConfig.experimental,
      },
      pageExtensions: nextConfig.pageExtensions ?? defaultPageExtensions,
      webpack: (config: Configuration, options) => {
        config.resolve ||= {};

        config.module ||= {};
        config.module.rules ||= [];

        config.module.rules.push({
          test: /\.mdx?$/,
          use: [
            options.defaultLoaders.babel,
            {
              loader: 'fumadocs-mdx/loader-mdx',
              options: mdxLoaderOptions,
            },
          ],
        });

        config.plugins ||= [];

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}
