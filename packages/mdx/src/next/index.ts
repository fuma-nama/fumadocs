import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import type { WebpackLoaderOptions } from '@/webpack';
import type { TurbopackLoaderOptions, TurbopackOptions } from 'next/dist/server/config-shared';
import * as path from 'node:path';
import picomatch from 'picomatch';
import { loadConfig } from '@/config/load-from-file';
import { _Defaults, type Core, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderFileGlob, metaLoaderQueryGlob } from '@/loaders';
import type { IndexFilePluginOptions } from '@/plugins/index-file';
import indexFile from '@/plugins/index-file';

export interface CreateMDXOptions {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * A list of glob patterns.
   */
  include?: string | string[];

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

  index?: IndexFilePluginOptions | false;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export function createMDX(createOptions: CreateMDXOptions = {}) {
  const options = applyDefaults(createOptions);
  const core = createNextCore(options);
  const isDev = process.env.NODE_ENV === 'development';
  const macro = options.macro;

  if (process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    void init(isDev, core);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const { configPath, outDir } = core.getOptions();
    const loaderOptions: WebpackLoaderOptions = {
      configPath,
      outDir,
      absoluteCompiledConfigPath: path.resolve(core.getCompiledConfigPath()),
      isDev,
      macro: macro !== undefined,
    };

    const turbopack: TurbopackOptions = {
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.turbopack?.rules,
        // `include` patterns are used as rule globs directly,
        // with a content condition to skip modules not using the macro API.
        ...(macro
          ? Object.fromEntries(
              macro.include.map((pattern) => [
                pattern,
                {
                  condition: {
                    content: /['"]fumadocs-mdx\/macro['"]/,
                  },
                  loaders: [
                    {
                      loader: 'fumadocs-mdx/webpack/macro',
                      options: loaderOptions as unknown as TurbopackLoaderOptions,
                    },
                  ],
                },
              ]),
            )
          : undefined),
        '*.{md,mdx}': {
          loaders: [
            {
              loader: 'fumadocs-mdx/webpack/mdx',
              options: loaderOptions as unknown as TurbopackLoaderOptions,
            },
          ],
          as: '*.js',
        },
        '*.json': {
          condition: {
            query: metaLoaderQueryGlob,
          },
          loaders: [
            {
              loader: 'fumadocs-mdx/webpack/meta',
              options: loaderOptions as unknown as TurbopackLoaderOptions,
            },
          ],
          as: '*.json',
        },
        '*.yaml': {
          condition: {
            query: metaLoaderQueryGlob,
          },
          loaders: [
            {
              loader: 'fumadocs-mdx/webpack/meta',
              options: loaderOptions as unknown as TurbopackLoaderOptions,
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

        if (macro) {
          const matcher = picomatch(macro.include, {
            ignore: ['**/node_modules/**'],
            // aligns slash-less patterns (e.g. `*.source.ts`)
            // with the glob semantics of Turbopack rule keys
            basename: true,
            // support backslashes
            windows: true,
          });

          config.module.rules.push({
            test: (resource) => matcher(path.relative(process.cwd(), resource)),
            enforce: 'pre',
            use: [
              {
                loader: 'fumadocs-mdx/webpack/macro',
                options: loaderOptions,
              },
            ],
          });
        }

        config.module.rules.push(
          {
            test: mdxLoaderGlob,
            use: [
              options.defaultLoaders.babel,
              {
                loader: 'fumadocs-mdx/webpack/mdx',
                options: loaderOptions,
              },
            ],
          },
          {
            test: metaLoaderFileGlob,
            resourceQuery: metaLoaderQueryGlob,
            enforce: 'pre',
            use: [
              {
                loader: 'fumadocs-mdx/webpack/meta',
                options: loaderOptions,
              },
            ],
          },
        );

        config.plugins ||= [];

        return nextConfig.webpack?.(config, options) ?? config;
      },
    };
  };
}

async function init(dev: boolean, core: Core): Promise<void> {
  async function initOrReload() {
    await core.init({
      config: loadConfig(core, true),
    });
    await core.emit({ write: true });
  }

  async function devServer() {
    const { FSWatcher } = await import('chokidar');
    const { configPath, outDir } = core.getOptions();
    const watcher = new FSWatcher({
      ignoreInitial: true,
      persistent: true,
      ignored: [outDir],
    });

    watcher.add(configPath);
    for (const collection of core.getCollections()) {
      watcher.add(collection.dir);
    }
    for (const workspace of core.getWorkspaces().values()) {
      for (const collection of workspace.getCollections()) {
        watcher.add(collection.dir);
      }
    }

    watcher.on('ready', () => {
      console.log('[MDX] started dev server');
    });

    const absoluteConfigPath = path.resolve(configPath);
    watcher.on('all', async (_event, file) => {
      if (path.resolve(file) === absoluteConfigPath) {
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

export async function postInstall(options: CreateMDXOptions = {}) {
  const resolved = applyDefaults(options);
  const core = createNextCore(resolved);
  await core.init({
    config: loadConfig(core, true),
  });
  await core.emit({ write: true });
}

interface ResolvedCreateMDXOptions {
  index: IndexFilePluginOptions | false;
  outDir: string;
  configPath: string;
  macro?: {
    include: string[];
  };
}

function applyDefaults(options: CreateMDXOptions): ResolvedCreateMDXOptions {
  const include = typeof options.include === 'string' ? [options.include] : options.include;

  return {
    index: options.index ?? {},
    outDir: options.outDir ?? _Defaults.outDir,
    configPath: options.configPath ?? _Defaults.configPath,
    macro: include && include.length > 0 ? { include } : undefined,
  };
}

function createNextCore(options: ResolvedCreateMDXOptions): Core {
  return createCore({
    environment: 'next',
    outDir: options.outDir,
    configPath: options.configPath,
    plugins: [options.index && indexFile(options.index)],
  });
}
