import { type Plugin, runnerImport } from 'vite';
import { buildConfig } from '@/config/build';
import { createMdxLoader } from '@/loaders/mdx';
import { toVite } from '@/loaders/adapter';
import type { FSWatcher } from 'chokidar';
import { _Defaults, Core, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import indexFile, { IndexFilePluginOptions } from '@/plugins/index-file';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import type { MacroContext, MacroEvaluator } from '@/macro/eval';

/** @internal do not use this */
export function createMacroEvaluator(root: string): MacroEvaluator {
  return async ({ entry, transform }) => {
    const { dependencies } = await runnerImport(entry, {
      root,
      plugins: [
        {
          name: 'fumadocs-mdx:macro-config',
          transform: {
            order: 'pre',
            async handler(code, id) {
              const [file] = id.split('?', 2);
              const result = await transform(code, file);
              if (result === null) return;

              return { code: result };
            },
          },
        },
      ],
    });

    return {
      inputs: [entry, ...dependencies.map((file) => path.resolve(root, file))],
    };
  };
}

export interface PluginOptions {
  /**
   * Enable the macro API (`fumadocs-mdx/macro`) for matching modules.
   *
   * Passed to the [`id` filter](https://vite.dev/guide/api-plugin#hook-filters) of the transform hook directly.
   */
  include?: string | RegExp | (string | RegExp)[];

  /**
   * Generate index files for accessing content.
   *
   * @defaultValue true
   */
  index?: boolean | IndexFilePluginOptions;

  /**
   * @defaultValue source.config.ts
   */
  configPath?: string;

  /**
   * Update Vite config to fix module resolution of Fumadocs
   *
   * @defaultValue true
   */
  updateViteConfig?: boolean;

  /**
   * Output directory of generated files
   *
   * @defaultValue '.source'
   */
  outDir?: string;
}

export default function mdx(
  forcedConfig?: Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
  pluginOptions: PluginOptions = {},
): Plugin[] {
  let root: string;
  let core: Core;
  let options: ResolvedPluginOptions;
  let macro: MacroContext | undefined;
  const metaPlugin: Plugin = {
    name: 'fumadocs-mdx:meta',
  };
  const mdxPlugin: Plugin = {
    name: 'fumadocs-mdx:mdx',
  };
  const macroPlugin: Plugin = {
    name: 'fumadocs-mdx:macro',
  };

  async function importConfig(): Promise<Record<string, unknown>> {
    try {
      return (await runnerImport<Record<string, unknown>>(options.configPath)).module;
    } catch (error) {
      // the config file is optional
      const missing = !(await fs.stat(options.configPath).catch(() => null));
      if (!missing) throw error;

      return {};
    }
  }

  return [
    {
      name: 'fumadocs-mdx',
      async config(config, env) {
        root = config.root ?? process.cwd();
        options = applyDefaults(root, pluginOptions);
        macro = options.include
          ? {
              root,
              outDir: options.outDir,
              isDev: env.command === 'serve',
              evaluator: createMacroEvaluator(root),
            }
          : undefined;
        core = createViteCore(options);

        await core.init({
          config: buildConfig(forcedConfig ? await forcedConfig : await importConfig(), root),
        });

        const configLoader = createIntegratedConfigLoader(core);
        const mdxLoader = toVite(createMdxLoader(configLoader, macro));
        const metaLoader = toVite(
          createMetaLoader(
            configLoader,
            {
              // vite has built-in plugin for JSON files
              json: 'json',
            },
            macro,
          ),
        );

        mdxPlugin.transform = {
          filter: { id: mdxLoaderGlob },
          order: 'pre',
          handler(code, id) {
            // Vite RSC will pass the compiled MDX file's client module with ID `virtual:vite-rsc/client-references/group/facade:xxx.mdx`.
            // The format of `value` becomes JavaScript, which will break the MDX compiler.
            // We have to ignore them.
            if (id.includes('virtual:vite-rsc')) return null;
            if (!forcedConfig) this.addWatchFile(options.configPath);
            return mdxLoader.transform.call(this, code, id);
          },
        };
        metaPlugin.transform = {
          filter: { id: metaLoaderGlob },
          order: 'pre',
          handler(code, id) {
            if (!forcedConfig) this.addWatchFile(options.configPath);
            return metaLoader.transform.call(this, code, id);
          },
        };

        if (macro) {
          const ctx = macro;
          const { MacroModuleId, transformMacroModule } = await import('@/macro/transform');

          macroPlugin.transform = {
            order: 'pre',
            filter: {
              id: {
                include: options.include,
                exclude: ['**/node_modules/**'],
              },
              code: MacroModuleId,
            },
            async handler(code, id) {
              const [file] = id.split('?', 2);
              const result = await transformMacroModule({
                code,
                file,
                root: ctx.root,
                target: 'vite',
              });
              if (!result) return;

              return {
                code: result.code,
                map: result.map as never,
              };
            },
          };
        }

        if ('_fumadocs_skipViteConfig' in config && config._fumadocs_skipViteConfig) return;
        if (!options.updateViteConfig) return;

        const { getConfig } = await import('@fumadocs/vite');
        return getConfig({ root });
      },
      async buildStart() {
        await core.emit({ write: true });
      },
      async configureServer(server) {
        await core.initServer({
          watcher: server.watcher as unknown as FSWatcher,
        });

        if (!forcedConfig) {
          server.watcher.on('change', async (file) => {
            if (path.resolve(file) === options.configPath) {
              await core.init({
                config: buildConfig(await importConfig(), root),
              });

              await core.emit({ write: true });
            }
          });
        }
      },
    },
    macroPlugin,
    mdxPlugin,
    metaPlugin,
  ];
}

export async function postInstall(pluginOptions: PluginOptions = {}) {
  const { loadConfig } = await import('@/config/load-from-file');
  const options = applyDefaults(process.cwd(), pluginOptions);
  const core = createViteCore(options);

  await core.init({ config: loadConfig(core, true) });
  await core.emit({ write: true });
}

type ResolvedPluginOptions = Omit<Required<PluginOptions>, 'include'> &
  Pick<PluginOptions, 'include'>;

function createViteCore({ index, configPath, outDir }: ResolvedPluginOptions) {
  if (index === true) index = {};

  return createCore({
    environment: 'vite',
    configPath,
    outDir,
    plugins: [
      index &&
        indexFile({
          ...index,
          target: index.target ?? 'vite',
        }),
    ],
  });
}

function applyDefaults(root: string, options: PluginOptions): ResolvedPluginOptions {
  return {
    updateViteConfig: options.updateViteConfig ?? true,
    index: options.index ?? true,
    configPath: path.resolve(root, options.configPath ?? _Defaults.configPath),
    outDir: path.resolve(root, options.outDir ?? _Defaults.outDir),
    include: options.include,
  };
}
