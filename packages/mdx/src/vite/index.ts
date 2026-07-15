import { type Plugin, runnerImport } from 'vite';
import { buildConfig } from '@/config/build';
import { createMdxLoader } from '@/loaders/mdx';
import { toVite } from '@/loaders/adapter';
import type { FSWatcher } from 'chokidar';
import { Core, CoreOptions, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import indexFile, { IndexFilePluginOptions } from '@/plugins/index-file';
import path from 'node:path';
import fs from 'node:fs/promises';
import { mdxLoaderGlob, metaLoaderGlob } from '@/loaders';
import type { MacroEvaluator } from '@/macro/eval';

function createMacroEvaluator(root: string): MacroEvaluator {
  return async ({ entry, transform }) => {
    const inputs = new Set<string>();
    inputs.add(entry);

    const { dependencies } = await runnerImport(entry, {
      root,
      plugins: [
        {
          name: 'fumadocs-mdx:macro-config',
          transform: {
            order: 'pre',
            async handler(code, id) {
              const [file] = id.split('?', 2);
              inputs.add(file);
              const result = await transform(code, file);
              if (result === null) return;

              return { code: result };
            },
          },
        },
      ],
    });
    for (const file of dependencies) inputs.add(path.resolve(root, file));

    return {
      inputs: Array.from(inputs),
    };
  };
}

export interface PluginOptions extends Pick<CoreOptions, 'configPath' | 'outDir' | 'plugins'> {
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
   * Update Vite config to fix module resolution of Fumadocs
   *
   * @defaultValue true
   */
  updateViteConfig?: boolean;
}

export default function mdx(
  forcedConfig?: Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
  pluginOptions: PluginOptions = {},
): Plugin[] {
  const { updateViteConfig = true } = pluginOptions;
  let core: Core;
  const metaPlugin: Plugin = {
    name: 'fumadocs-mdx:meta',
  };
  const mdxPlugin: Plugin = {
    name: 'fumadocs-mdx:mdx',
  };
  const macroPlugin: Plugin = {
    name: 'fumadocs-mdx:macro',
  };

  return [
    {
      name: 'fumadocs-mdx',
      async config(config, env) {
        core = createViteCore(config.root ?? process.cwd(), pluginOptions);
        if (pluginOptions.include) {
          const { MacroCollector } = await import('@/macro/eval');

          core.macro = new MacroCollector({
            root: core.root,
            outDir: core.outDir,
            isDev: env.command === 'serve',
            evaluator: createMacroEvaluator(core.root),
          });
        }

        await core.init({
          config: buildConfig(
            forcedConfig ? await forcedConfig : await importConfigFile(core.configPath),
            core.root,
          ),
        });

        const configLoader = createIntegratedConfigLoader(core);
        const mdxLoader = toVite(createMdxLoader(configLoader));
        const metaLoader = toVite(
          createMetaLoader(configLoader, {
            // vite has built-in plugin for JSON files
            json: 'json',
          }),
        );

        mdxPlugin.transform = {
          filter: { id: mdxLoaderGlob },
          order: 'pre',
          handler(code, id) {
            // Vite RSC will pass the compiled MDX file's client module with ID `virtual:vite-rsc/client-references/group/facade:xxx.mdx`.
            // The format of `value` becomes JavaScript, which will break the MDX compiler.
            // We have to ignore them.
            if (id.includes('virtual:vite-rsc')) return null;
            if (!forcedConfig) this.addWatchFile(core.configPath);
            return mdxLoader.transform.call(this, code, id);
          },
        };
        metaPlugin.transform = {
          filter: { id: metaLoaderGlob },
          order: 'pre',
          handler(code, id) {
            if (!forcedConfig) this.addWatchFile(core.configPath);
            return metaLoader.transform.call(this, code, id);
          },
        };

        if (core.macro) {
          const root = core.root;
          const { MacroModuleId, transformMacroModule } = await import('@/macro/transform');

          macroPlugin.transform = {
            order: 'pre',
            filter: {
              id: pluginOptions.include,
              code: MacroModuleId,
            },
            async handler(code, id) {
              const [file] = id.split('?', 2);
              const result = await transformMacroModule({
                code,
                file,
                root,
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
        if (!updateViteConfig) return;

        const { getConfig } = await import('@fumadocs/vite');
        return getConfig({ root: core.root });
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
            if (path.resolve(file) === core.configPath) {
              await core.init({
                config: buildConfig(await importConfigFile(core.configPath), core.root),
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

async function importConfigFile(configPath: string): Promise<Record<string, unknown>> {
  const exists = await fs.access(configPath).then(
    () => true,
    () => false,
  );
  if (!exists) return {};
  return (await runnerImport<Record<string, unknown>>(configPath)).module;
}

export async function postInstall(pluginOptions: PluginOptions = {}) {
  const core = createViteCore(process.cwd(), pluginOptions);
  await core.init({
    config: buildConfig(await importConfigFile(core.configPath), process.cwd()),
  });
  await core.emit({ write: true });
}

function createViteCore(root: string, { index = true, configPath, outDir }: PluginOptions) {
  if (index === true) index = {};

  return createCore({
    environment: 'vite',
    root,
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
