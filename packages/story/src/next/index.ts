import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import type { TurbopackLoaderOptions, TurbopackOptions } from 'next/dist/server/config-shared';
import type { StoryLoaderOptions } from '@/webpack/story';

export interface NextStoryOptions extends StoryLoaderOptions {
  /**
   * Filter story files to transform (glob)
   *
   * @default '*.story.{js,jsx,ts,tsx}'
   */
  filter?: string;
}

export function createNextStory(createOptions: NextStoryOptions = {}) {
  const { filter = '*.story.{js,jsx,ts,tsx}', tsconfigPath } = createOptions;

  return (nextConfig: NextConfig = {}): NextConfig => {
    const loaderOptions: StoryLoaderOptions = {};
    if (tsconfigPath) {
      loaderOptions.tsconfigPath = tsconfigPath;
    }

    const turbopack: TurbopackOptions = {
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.turbopack?.rules,
        [filter]: {
          loaders: [
            {
              loader: '@fumadocs/story/webpack/story',
              options: loaderOptions as unknown as TurbopackLoaderOptions,
            },
          ],
        },
      },
    };

    return {
      ...nextConfig,
      turbopack,
      webpack(config: Configuration, options) {
        config.module ||= {};
        config.module.rules ||= [];
        config.module.rules.push({
          test: filter,
          enforce: 'pre',
          use: [
            {
              loader: '@fumadocs/story/webpack/story',
              options: loaderOptions,
            },
          ],
        });

        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}
