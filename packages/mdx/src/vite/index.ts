import { runnerImport, type Plugin } from 'vite';
import { buildConfig } from '@/config/build';
import { ValidationError } from '@/utils/validation';
import { createMdxLoader } from '@/loaders/mdx';
import { toVite } from '@/loaders/adapter';
import type { FSWatcher } from 'chokidar';
import { _Defaults, createCore } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';
import indexFile, { IndexFilePluginOptions } from '@/plugins/index-file';
import { crawlFrameworkPkgs } from 'vitefu';

export interface PluginOptions {
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

export default async function mdx(
  _config?: Record<string, unknown> | Promise<Record<string, unknown>>,
  pluginOptions: PluginOptions = {},
): Promise<Plugin> {
  const options = applyDefaults(pluginOptions);
  const core = createViteCore(options);
  const config =
    (await _config) ?? (await runnerImport<Record<string, unknown>>(options.configPath)).module;
  await core.init({
    config: buildConfig(config),
  });

  const configLoader = createIntegratedConfigLoader(core);
  const mdxLoader = toVite(createMdxLoader(configLoader));
  const metaLoader = toVite(
    createMetaLoader(configLoader, {
      // vite has built-in plugin for JSON files
      json: 'json',
    }),
  );

  return {
    name: 'fumadocs-mdx',
    // needed, otherwise other plugins will be executed before our `transform`.
    enforce: 'pre',
    async config(config, { command }) {
      if (!options.updateViteConfig) return config;

      const out = await crawlFrameworkPkgs({
        root: process.cwd(),
        isBuild: command === 'build',
        isFrameworkPkgByName(pkgName) {
          if (
            pkgName.startsWith('@fumapress/') ||
            pkgName.startsWith('@fumadocs/') ||
            pkgName.startsWith('fumadocs-') ||
            pkgName === 'fumapress'
          )
            return true;
        },
      });

      return {
        ssr: {
          noExternal: out.ssr.noExternal,
        },
        optimizeDeps: out.optimizeDeps,
      };
    },
    async buildStart() {
      await core.emit({ write: true });
    },
    async configureServer(server) {
      await core.initServer({
        watcher: server.watcher as unknown as FSWatcher,
      });
    },
    async transform(value, id) {
      // Vite RSC will pass the compiled MDX file's client module with ID `virtual:vite-rsc/client-references/group/facade:xxx.mdx`.
      // The format of `value` becomes JavaScript, which will break the MDX compiler.
      // We have to ignore them.
      if (id.includes('virtual:vite-rsc')) return null;

      try {
        if (metaLoader.filter(id)) {
          return await metaLoader.transform.call(this, value, id);
        }

        if (mdxLoader.filter(id)) {
          return await mdxLoader.transform.call(this, value, id);
        }
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new Error(await e.toStringFormatted(), { cause: e });
        }

        throw e;
      }
    },
  };
}

export async function postInstall(pluginOptions: PluginOptions = {}) {
  const { loadConfig } = await import('@/config/load-from-file');
  const core = createViteCore(applyDefaults(pluginOptions));
  await core.init({
    config: loadConfig(core, true),
  });
  await core.emit({ write: true });
}

function createViteCore({ index, configPath, outDir }: Required<PluginOptions>) {
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

function applyDefaults(options: PluginOptions): Required<PluginOptions> {
  return {
    updateViteConfig: options.updateViteConfig ?? true,
    index: options.index ?? true,
    configPath: options.configPath ?? _Defaults.configPath,
    outDir: options.outDir ?? _Defaults.outDir,
  };
}
