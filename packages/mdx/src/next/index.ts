import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { type Options as MDXLoaderOptions } from '@/webpack';
import type {
  TurbopackLoaderOptions,
  TurbopackOptions,
} from 'next/dist/server/config-shared';
import * as path from 'node:path';
import { loadConfig } from '@/config/load-from-file';
import { removeFileCache } from '@/next/file-cache';
import { ValidationError } from '@/utils/validation';
import next from '@/plugins/next';
import { type Core, createCore, findConfigFile } from '@/core';

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

export function createMDX(createOptions: CreateMDXOptions = {}) {
  const options = applyDefaults(createOptions);
  const isDev = process.env.NODE_ENV === 'development';

  if (process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    void init(isDev, options);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const mdxLoaderOptions: MDXLoaderOptions = {
      ...options,
      isDev,
    };

    const turbopack: TurbopackOptions = {
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.turbopack?.rules,
        '*.{md,mdx}': {
          loaders: [
            {
              loader: 'fumadocs-mdx/loader-mdx',
              options: mdxLoaderOptions as unknown as TurbopackLoaderOptions,
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

async function init(
  dev: boolean,
  options: Required<CreateMDXOptions>,
): Promise<void> {
  const core = createNextCore(options);

  async function initOrReload() {
    await core.init({
      config: loadConfig(options.configPath, options.outDir, true),
    });
    await core.emitAndWrite();
  }

  async function devServer() {
    const { FSWatcher } = await import('chokidar');
    const watcher = new FSWatcher({
      ignoreInitial: true,
      persistent: true,
      ignored: [options.outDir],
    });

    watcher.add(options.configPath);
    for (const collection of core.getConfig().collectionList) {
      if (collection.type === 'docs') {
        watcher.add(collection.docs.dir);
        watcher.add(collection.meta.dir);
      } else {
        watcher.add(collection.dir);
      }
    }

    watcher.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    watcher.on('all', async (event, file) => {
      const absolutePath = path.resolve(file);
      if (event === 'change') removeFileCache(absolutePath);

      if (absolutePath === path.resolve(options.configPath)) {
        // skip plugin listeners
        watcher.removeAllListeners();

        await watcher.close();
        await initOrReload();
        console.log('[MDX] restarting dev server');
        await devServer();
      }
    });

    process.on('exit', () => {
      if (watcher.closed) return;

      console.log('[MDX] closing dev server');
      void watcher.close();
    });

    await core.initServer({ watcher });
  }

  await initOrReload();
  if (dev) {
    await devServer();
  }
}

export async function postInstall(
  configPath = findConfigFile(),
  outDir = '.source',
) {
  const core = await createNextCore({
    outDir,
    configPath,
  }).init({
    config: loadConfig(configPath, outDir, true),
  });

  await core.emitAndWrite();
}

function applyDefaults(options: CreateMDXOptions): Required<CreateMDXOptions> {
  return {
    outDir: options.outDir ?? '.source',
    configPath: options.configPath ?? findConfigFile(),
  };
}

function createNextCore({
  outDir,
  configPath,
}: Required<CreateMDXOptions>): Core {
  const core = createCore(
    {
      environment: 'next',
      outDir,
      configPath,
    },
    [next()],
  );

  return {
    ...core,
    async emitAndWrite(...args) {
      try {
        await core.emitAndWrite(...args);
      } catch (err) {
        if (err instanceof ValidationError) {
          console.error(err.toStringFormatted());
        } else {
          console.error(err);
        }
      }
    },
  };
}
