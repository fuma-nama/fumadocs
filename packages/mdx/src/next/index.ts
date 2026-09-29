import type { NextConfig } from 'next';
import type { Configuration } from 'webpack';
import type { WebpackLoaderOptions } from '@/webpack';
import type {
  TurbopackLoaderOptions,
  TurbopackOptions,
  TurbopackRuleConfigItem,
} from 'next/dist/server/config-shared';
import * as path from 'node:path';
import { loadConfig } from '@/config/load-from-file';
import { type Core, CoreOptions, createCore } from '@/core';
import { mdxLoaderGlob, metaLoaderFileGlob, metaLoaderQueryGlob } from '@/loaders';
import type { IndexFilePluginOptions } from '@/plugins/index-file';
import indexFile from '@/plugins/index-file';
import { createMacroMatcher, resolveMacroOptions, type MacroPluginOption } from '@/macro/options';

export interface CreateMDXOptions extends Pick<CoreOptions, 'configPath' | 'outDir'> {
  /**
   * Configure the macro API (`fumadocs-mdx/macro`), or `false` to disable it.
   *
   * `macro.include` is a list of glob patterns.
   */
  macro?: MacroPluginOption;
  index?: IndexFilePluginOptions | false;
}

const defaultPageExtensions = ['mdx', 'md', 'jsx', 'js', 'tsx', 'ts'];

export function createMDX(options: CreateMDXOptions = {}) {
  const core = createNextCore(options);
  const isDev = process.env.NODE_ENV === 'development';
  const macro = resolveMacroOptions(options.macro);

  let pending: Promise<void> | undefined;
  if (process.env._FUMADOCS_MDX !== '1') {
    process.env._FUMADOCS_MDX = '1';

    pending = init(isDev, core);
    // reported here in case no consumer awaits the returned config
    pending.catch((err) => {
      console.error('[MDX] failed to generate files:', err);
    });
  }

  function onLoaderOptions(type: WebpackLoaderOptions['type']): WebpackLoaderOptions {
    return {
      type,
      configPath: core.configPath,
      outDir: core.outDir,
      compiledConfigPath: core.getCompiledConfigPath(),
      isDev,
      macro: macro !== undefined,
    };
  }

  return (nextConfig: NextConfig = {}): NextConfig & PromiseLike<NextConfig> => {
    const turbopackLoaderOptions = onLoaderOptions('turbopack');

    const turbopack: TurbopackOptions = {
      ...nextConfig.turbopack,
      rules: {
        ...nextConfig.turbopack?.rules,
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
                      options: turbopackLoaderOptions as unknown as TurbopackLoaderOptions,
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
              options: turbopackLoaderOptions as unknown as TurbopackLoaderOptions,
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
              options: turbopackLoaderOptions as unknown as TurbopackLoaderOptions,
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
              options: turbopackLoaderOptions as unknown as TurbopackLoaderOptions,
            },
          ],
          as: '*.js',
        },
      },
    };

    const out: NextConfig = {
      ...nextConfig,
      turbopack,
      pageExtensions: nextConfig.pageExtensions ?? defaultPageExtensions,
      webpack: (config: Configuration, options) => {
        config.resolve ||= {};
        config.module ||= {};
        config.module.rules ||= [];
        const loaderOptions = onLoaderOptions('webpack');

        if (macro) {
          const matcher = createMacroMatcher(macro);

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

    const ready = pending ?? Promise.resolve();
    // `then` must be non-enumerable: object consumers (`Object.keys`, spread) should see a
    // plain config, while consumers that `await` it (like Next) block until the initial
    // generation is fully written to disk (#3450).
    return Object.defineProperty(out, 'then', {
      enumerable: false,
      configurable: true,
      writable: true,
      value(
        onFulfilled?: ((value: NextConfig) => unknown) | null,
        onRejected?: ((reason: unknown) => unknown) | null,
      ) {
        return ready
          .then(() => {
            // object rest skips the non-enumerable `then`: the resolved value must not be
            // thenable, or `await` would assimilate it recursively
            const { ...clean } = out;
            return clean;
          })
          .then(onFulfilled, onRejected);
      },
    }) as NextConfig & PromiseLike<NextConfig>;
  };
}

function init(dev: boolean, core: Core): Promise<void> {
  async function initOrReload() {
    const { config, fromFile } = await loadConfig(core, true);
    await core.init({ config });
    // macro-only projects have no config file, index files shouldn't be emitted
    if (fromFile) await core.emit({ write: true });
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

  const ready = initOrReload();
  if (dev) {
    // config load must not block on watcher setup, only on generated files
    void ready
      .then(devServer, () => {})
      .catch((err) => {
        console.error('[MDX] failed to start dev server:', err);
      });
  }
  return ready;
}

export async function postInstall(options: CreateMDXOptions = {}) {
  const core = createNextCore(options);
  const { config, fromFile } = await loadConfig(core, true);
  await core.init({ config });
  if (fromFile) await core.emit({ write: true });
}

function createNextCore({ outDir, configPath, index = {} }: CreateMDXOptions): Core {
  return createCore({
    environment: 'next',
    outDir,
    configPath,
    plugins: [index && indexFile(index)],
  });
}
