import path from 'node:path';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { findConfigFile } from '@/config/load';
import { start } from '@/map';
import { type Options as MDXLoaderOptions } from '../loader-mdx';

export interface CreateMDXOptions {
  /**
   * Path to source configuration file
   */
  configPath?: string;
}

const outDir = path.resolve('.source');
const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export { start };

export function createMDX({
  configPath = findConfigFile(),
}: CreateMDXOptions = {}) {
  // Next.js performs multiple iteration on the `next.config.js` file
  // the first time contains the original arguments of `next dev`
  // we only execute on the first iteration
  const isDev = process.argv.includes('dev');
  const isBuild = process.argv.includes('build');

  if ((isDev || isBuild) && process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    void start(isDev, configPath, outDir);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const mdxLoaderOptions: MDXLoaderOptions = {
      _ctx: {
        configPath,
      },
    };

    return {
      ...nextConfig,
      experimental: {
        ...nextConfig.experimental,
        turbo: {
          ...nextConfig.experimental?.turbo,
          rules: {
            ...nextConfig.experimental?.turbo?.rules,
            // @ts-expect-error -- safe types
            '*.{md,mdx}': {
              loaders: [
                {
                  loader: 'fumadocs-mdx/loader-mdx',
                  options: mdxLoaderOptions,
                },
              ],
              as: '*.js',
            },
          },
        },
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
