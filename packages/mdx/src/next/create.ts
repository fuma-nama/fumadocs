import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { findConfigFile } from '@/loaders/config';
import { start } from './map';
import { type Options as MDXLoaderOptions } from '../loader-mdx';
import type { TurbopackOptions } from 'next/dist/server/config-shared';

export interface CreateMDXOptions {
  /**
   * Path to source configuration file
   */
  configPath?: string;

  /**
   * Directory for output files
   *
   * @defaultValue '.source'
   */
  outDir?: string;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];
export { start };

export function createMDX({
  configPath = findConfigFile(),
  outDir = '.source',
}: CreateMDXOptions = {}) {
  if (process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    void start(process.env.NODE_ENV === 'development', configPath, outDir);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const mdxLoaderOptions: MDXLoaderOptions = {
      configPath,
      outDir,
    };
    const turbopack: TurbopackOptions = {
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.turbopack?.rules,
        '*.{md,mdx}': {
          loaders: [
            {
              loader: 'fumadocs-mdx/loader-mdx',
              options: mdxLoaderOptions as any,
            },
          ],
          as: '*.js',
        },
      },
    };

    return {
      ...nextConfig,
      turbopack,
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

        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}
