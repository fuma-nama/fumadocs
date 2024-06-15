import path from 'node:path';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { type InputMDXOptions } from '@/loader-mdx';
import {
  SearchIndexPlugin,
  type Options as SearchIndexPluginOptions,
} from '@/webpack-plugins/search-index-plugin';
import { RootMapFile } from '@/root-map-file';
import type { LoaderOptions } from './loader';

export interface CreateMDXOptions {
  cwd?: string;

  mdxOptions?: InputMDXOptions;

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

  /**
   * Support Turbopack (experimental)
   *
   * @defaultValue false
   */
  experimentalTurbo?: boolean;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

function createMDX({
  mdxOptions = {},
  cwd = process.cwd(),
  rootMapPath = './.map.ts',
  rootContentPath = './content',
  buildSearchIndex = false,
  experimentalTurbo = false,
  ...loadOptions
}: CreateMDXOptions = {}) {
  const rootMapFile = path.resolve(cwd, rootMapPath);
  const rootContentDir = path.resolve(cwd, rootContentPath);

  if (
    new RootMapFile({
      rootMapFile,
    }).create()
  ) {
    console.log(`Created ${rootMapFile} automatically.`);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    if (experimentalTurbo) {
      if (process.env.NODE_ENV === 'development' && !isSerializable(mdxOptions)) {
        console.warn('`mdxOptions` must be serializable (e.g. JavaScript primitives)');
      }

      return {
        ...nextConfig,
        pageExtensions: nextConfig.pageExtensions ?? defaultPageExtensions,
        experimental: {
          turbo: {
            rules: {
              '*.{md,mdx}': [
                {
                  loader: 'fumadocs-mdx/loader-mdx',
                  // TODO: how do we communicate to the user about this?
                  // @ts-expect-error(arlyon): user must ensure only JSON is sent
                  options: mdxOptions as object,
                },
              ],
              '.map.ts': [
                {
                  loader: 'fumadocs-mdx/loader',
                  options: {
                    rootContentDir,
                    rootMapFile,
                    ...loadOptions,
                  } satisfies LoaderOptions,
                },
              ],
            },
          },
        },
      };
    }

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
                options: mdxOptions,
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

type JSONValue = string | boolean | number | JSONValue[] | {
  [key: string]: JSONValue
}

// TODO: Improve the check function
function isSerializable(options: unknown): options is JSONValue {
  if (options === null) return true;

  if (typeof options === 'object') {
    return Object.values(options).every(isSerializable)
  }

  if (Array.isArray(options)) options.every(isSerializable)

  return ['string', 'number', 'bigint', 'boolean'].includes(typeof options)
}

export { createMDX as default };
