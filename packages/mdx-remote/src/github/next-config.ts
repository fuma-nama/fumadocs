import { createRequire } from 'node:module';
import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import {
  isSerializable,
  type Prettify,
  type RequiredFields,
  type JSONValue,
} from './utils';
import type { CreateCacheOptions } from './types';

type RequiredCacheOptions = RequiredFields<CreateCacheOptions<'local'>> &
  RequiredFields<CreateCacheOptions<'remote'>>;
type DirectoryOptions =
  | {
      /**
       * Directory where content is found
       * Used for local and remote
       */
      directory: string;
    }
  | {
      /**
       * Local directory where content is found
       */
      localDirectory: string;
      /**
       * Remote directory on the repository where content is found
       * Leave empty if you want to use the root directory
       */
      githubDirectory: string;
    };
export type PluginCacheOptions = Omit<
  RequiredCacheOptions & Omit<CreateCacheOptions, keyof RequiredCacheOptions>,
  'directory'
> &
  DirectoryOptions;

export type PluginOptions = Prettify<
  PluginCacheOptions & {
    experimentalTurbo?: boolean;
  }
>;

const require = createRequire(import.meta.url);

export default function createGithub(pluginOptions?: PluginOptions) {
  const {
    experimentalTurbo = Boolean(process.env.TURBOPACK),
    ...cacheOptions
  } = pluginOptions ?? {};

  const additionalNextConfig: NextConfig = {};

  const sourcePath = require.resolve('@fumadocs/mdx-remote/github/source');

  if (experimentalTurbo) {
    if (!isSerializable(pluginOptions)) {
      throw new Error(
        'The options provided for the Fumadocs Github plugin are not serializable. This is necessary for the Turbopack.',
      );
    }

    additionalNextConfig.experimental = {
      turbo: {
        rules: {
          'source.mjs': {
            loaders: [
              {
                loader: '@fumadocs/mdx-remote/github/loader',
                options: cacheOptions as Record<string, JSONValue>,
              },
            ],
          },
        },
      },
    };
  }

  return function withGithub(nextConfig: NextConfig = {}): NextConfig {
    if (!experimentalTurbo) {
      additionalNextConfig.webpack = (config: Configuration, options) => {
        config.module ||= {};
        config.module.rules ||= [];
        config.module.rules.push({
          test: sourcePath,
          use: [
            options.defaultLoaders.babel,
            {
              loader: '@fumadocs/mdx-remote/github/loader',
              options: cacheOptions,
            },
          ],
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-return -- not provided
        return nextConfig.webpack?.(config, options) ?? config;
      };
    }

    return {
      ...nextConfig,
      ...additionalNextConfig,
    };
  };
}
