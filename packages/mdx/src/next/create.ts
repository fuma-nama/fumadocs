import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { findConfigFile } from '@/utils/config';
import { start } from '@/map';
import { type Options as MDXLoaderOptions } from '../loader-mdx';
import { readFileSync } from 'node:fs';
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

let isTurboExperimental: boolean;

// not a good solution, but works
try {
  const content = readFileSync('./node_modules/next/package.json').toString();
  const version = JSON.parse(content).version as string;

  isTurboExperimental =
    version.startsWith('15.0.') ||
    version.startsWith('15.1.') ||
    version.startsWith('15.2.');
} catch {
  isTurboExperimental = false;
}

export { start };

export function createMDX({
  configPath = findConfigFile(),
  outDir = '.source',
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
      configPath,
      outDir,
    };
    const turbo: TurbopackOptions = {
      ...nextConfig.experimental?.turbo,
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.experimental?.turbo?.rules,
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

    const updated: NextConfig = {
      ...nextConfig,
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

    if (isTurboExperimental) {
      updated.experimental = { ...updated.experimental, turbo };
    } else {
      updated.turbopack = turbo;
    }

    return updated;
  };
}
