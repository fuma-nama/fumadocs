import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import type { WebpackLoaderOptions } from '@/webpack';
import type {
  TurbopackLoaderOptions,
  TurbopackOptions,
  TurbopackRuleConfigItem,
} from 'next/dist/server/config-shared';
import * as path from 'node:path';
import picomatch from 'picomatch';
import { loadConfig } from '@/config/load-from-file';
import { type Core, CoreOptions, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderFileGlob, metaLoaderQueryGlob } from '@/loaders';
import type { IndexFilePluginOptions } from '@/plugins/index-file';
import indexFile from '@/plugins/index-file';

export interface CreateMDXOptions extends Pick<CoreOptions, 'configPath' | 'outDir'> {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * A list of glob patterns.
   */
  include?: string | string[];
  index?: IndexFilePluginOptions | false;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export function createMDX(options: CreateMDXOptions = {}) {
  const core = createNextCore(options);
  const isDev = process.env.NODE_ENV === 'development';
  let macro: { include: string[] } | undefined;
  if (Array.isArray(options.include) && options.include.length > 0) {
    macro = { include: options.include };
  } else if (typeof options.include === 'string') {
    macro = { include: [options.include] };
  }

  if (process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    void init(isDev, core);
  }

  return (nextConfig: NextConfig = {}): NextConfig => {
    const loaderOptions: WebpackLoaderOptions = {
      configPath: core.configPath,
      outDir: core.outDir,
      absoluteCompiledConfigPath: path.resolve(core.getCompiledConfigPath()),
      isDev,
      macro: macro !== undefined,
    };
    const turbopackMetaLoaderOptions: WebpackLoaderOptions = {
      ...loaderOptions,
      metaJsonOutput: 'js',
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
                } satisfies TurbopackRuleConfigItem,
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
              options: turbopackMetaLoaderOptions as unknown as TurbopackLoaderOptions,
            },
          ],
          // TODO: output json directly when Turbopack supports output format other than JavaScript.
          as: '*.js',
        },
        '*.yaml': {
          condition: {
            query: metaLoaderQueryGlob,
          },
          loaders: [
            {
              loader: 'fumadocs-mdx/webpack/meta',
              options: turbopackMetaLoaderOptions as unknown as TurbopackLoaderOptions,
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
    const watcher = new FSWatcher({
      ignoreInitial: true,
      persistent: true,
      ignored: [core.outDir],
    });

    watcher.add(core.configPath);
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

    watcher.on('all', async (_event, file) => {
      if (path.resolve(file) === core.configPath) {
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
  const core = createNextCore(options);
  await core.init({
    config: loadConfig(core, true),
  });
  await core.emit({ write: true });
}

function createNextCore({ outDir, configPath, index = {} }: CreateMDXOptions): Core {
  return createCore({
    environment: 'next',
    outDir,
    configPath,
    plugins: [index && indexFile(index)],
  });
}
