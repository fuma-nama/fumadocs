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
import { MacroModuleId, resolveMacroOptions, type MacroPluginOption } from '@/macro/options';
import type { GlobalConfig } from '@/config';

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
   * Configure the macro API (`fumadocs-mdx/macro`), or `false` to disable it.
   *
   * `macro.include` is passed to the
   * [`id` filter](https://vite.dev/guide/api-plugin#hook-filters) of the transform hook.
   */
  macro?: MacroPluginOption;

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

  /** extra global options, will be shallow-merged if another global config is specified in the main config file. */
  globalOptions?: GlobalConfig;
}

export interface FumadocsMdxOptions extends PluginOptions {
  /** force a config module object instead of importing from config path. */
  forcedConfig?: Record<string, unknown> | Promise<Record<string, unknown>>;
}

export function fumadocsMdx(options?: FumadocsMdxOptions) {
  return mdx(options?.forcedConfig, options);
}

export default function mdx(
  forcedConfig?: Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
  pluginOptions: PluginOptions = {},
): Plugin[] {
  const { updateViteConfig = true } = pluginOptions;
  let managed: ManagedCore;
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
        managed = createManagedCore(config.root ?? process.cwd(), forcedConfig, pluginOptions);
        const core = managed.core;
        const macroOptions = resolveMacroOptions(pluginOptions.macro);
        if (macroOptions) {
          const { MacroCollector } = await import('@/macro/eval');

          core.macro = new MacroCollector({
            root: core.root,
            outDir: core.outDir,
            isDev: env.command === 'serve',
            evaluator: createMacroEvaluator(core.root),
          });
        }

        await managed.reload();

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
            if (managed.watchConfig) this.addWatchFile(core.configPath);
            return mdxLoader.transform.call(this, code, id);
          },
        };
        metaPlugin.transform = {
          filter: { id: metaLoaderGlob },
          order: 'pre',
          handler(code, id) {
            if (managed.watchConfig) this.addWatchFile(core.configPath);
            return metaLoader.transform.call(this, code, id);
          },
        };

        if (macroOptions) {
          const root = core.root;

          macroPlugin.transform = {
            order: 'pre',
            filter: {
              id: { include: macroOptions.include, exclude: macroOptions.exclude },
              code: MacroModuleId,
            },
            async handler(code, id) {
              const [file] = id.split('?', 2);
              const { transformMacroModule } = await import('@/macro/transform');
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
        return getConfig({ root: core.root, isBuild: env.command === 'build' });
      },
      async buildStart() {
        // macro-only projects have no config file, index files shouldn't be emitted
        if (forcedConfig || managed.watchConfig) await managed.core.emit({ write: true });
      },
      async configureServer(server) {
        const core = managed.core;
        await core.initServer({
          watcher: server.watcher as unknown as FSWatcher,
        });

        if (forcedConfig) return;

        // also handle `add`, the config file is optional and may be created later
        const onChange = async (file: string) => {
          if (path.resolve(file) !== core.configPath) return;

          await managed.reload();
          if (managed.watchConfig) await core.emit({ write: true });
        };

        server.watcher.on('change', onChange);
        server.watcher.on('add', onChange);
      },
    },
    macroPlugin,
    mdxPlugin,
    metaPlugin,
  ];
}

/**
 * A core with its config file, reloadable when the file changes.
 *
 * `source.config.ts` is optional, so the config file may not exist. Vite fails to resolve watched
 * files that aren't on disk, hence `watchConfig` to tell whether it can be referenced.
 */
interface ManagedCore {
  core: Core;
  watchConfig: boolean;
  reload: () => Promise<void>;
}

function createManagedCore(
  root: string,
  forcedConfig: Record<string, unknown> | Promise<Record<string, unknown>> | undefined,
  pluginOptions: PluginOptions,
): ManagedCore {
  const managed: ManagedCore = {
    core: createViteCore(root, pluginOptions),
    watchConfig: false,
    async reload() {
      const { config, fromFile } = await loadCoreConfig(managed.core, forcedConfig, pluginOptions);
      managed.watchConfig = fromFile;
      await managed.core.init({ config });
    },
  };

  return managed;
}

async function loadCoreConfig(
  core: Core,
  forcedConfig?: Record<string, unknown> | Promise<Record<string, unknown>>,
  { globalOptions }: PluginOptions = {},
): Promise<{ config: Awaited<ReturnType<typeof buildConfig>>; fromFile: boolean }> {
  let v: Record<string, unknown>;
  let fromFile = false;

  if (forcedConfig) {
    v = await forcedConfig;
  } else {
    const exists = await fs.access(core.configPath).then(
      () => true,
      () => false,
    );
    v = exists ? (await runnerImport<Record<string, unknown>>(core.configPath)).module : {};
    fromFile = exists;
  }

  const config = await buildConfig(
    globalOptions
      ? {
          ...v,
          default: {
            ...(typeof v.default === 'object' ? v.default : undefined),
            ...globalOptions,
          },
        }
      : v,
    core.root,
  );

  return { config, fromFile };
}

export async function postInstall(pluginOptions: PluginOptions = {}) {
  const managed = createManagedCore(process.cwd(), undefined, pluginOptions);
  await managed.reload();
  if (managed.watchConfig) await managed.core.emit({ write: true });
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
