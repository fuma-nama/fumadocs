import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import { findConfigFile } from '@/loaders/config';
import { type Options as MDXLoaderOptions } from '@/webpack';
import type {
  TurbopackLoaderOptions,
  TurbopackOptions,
} from 'next/dist/server/config-shared';
import * as path from 'node:path';
import { loadConfig } from '@/loaders/config/load';
import { removeFileCache } from '@/next/file-cache';
import { ValidationError } from '@/utils/validation';
import next from '@/plugins/next';
import type { EventName } from 'chokidar/handler.js';
import { createCore } from '@/core';

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

  async function updateConfig() {
    await core.init({
      config: loadConfig(options.configPath, options.outDir, true),
    });
  }

  async function emitFiles() {
    const start = performance.now();

    try {
      await core.emitAndWrite();
    } catch (err) {
      if (err instanceof ValidationError) {
        console.error(err.toStringFormatted());
      } else {
        console.error(err);
      }
    }

    console.log(`[MDX] updated files in ${performance.now() - start}ms`);
  }

  async function devServer() {
    const { FSWatcher } = await import('chokidar');
    const watcher = new FSWatcher({
      ignoreInitial: true,
      persistent: true,
      ignored: [options.outDir],
    });

    watcher.add(options.configPath);
    for (const collection of core.getConfig().collections.values()) {
      if (collection.type === 'docs') {
        watcher.add(collection.docs.dir);
        watcher.add(collection.meta.dir);
      } else {
        watcher.add(collection.dir);
      }
    }

    await core.initServer({ watcher });

    async function onUpdate(event: EventName, file: string) {
      const absolutePath = path.resolve(file);
      if (event === 'change') removeFileCache(absolutePath);

      if (absolutePath === path.resolve(options.configPath)) {
        await updateConfig();
        console.log('[MDX] restarting dev server');
        await watcher.close();
        void devServer();
      }

      await emitFiles();
    }

    watcher.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    watcher.on('all', (event, file) => {
      void onUpdate(event, file);
    });

    process.on('exit', () => {
      console.log('[MDX] closing dev server');
      void watcher.close();
    });
  }

  await updateConfig();
  await emitFiles();
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
  console.log('[MDX] generated');
}

function applyDefaults(options: CreateMDXOptions): Required<CreateMDXOptions> {
  return {
    outDir: options.outDir ?? '.source',
    configPath: options.configPath ?? findConfigFile(),
  };
}

function createNextCore({ outDir, configPath }: Required<CreateMDXOptions>) {
  return createCore(
    {
      environment: 'next',
      outDir,
      configPath,
    },
    [next()],
  );
}
