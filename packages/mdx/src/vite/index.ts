import { mergeConfig, type Plugin, type UserConfig } from 'vite';
import { buildConfig } from '@/config/build';
import { ValidationError } from '@/utils/validation';
import { createMdxLoader } from '@/loaders/mdx';
import { toVite } from '@/loaders/adapter';
import vite, { type IndexFileOptions } from '@/plugins/vite';
import type { FSWatcher } from 'chokidar';
import { createCore, findConfigFile } from '@/core';
import { createIntegratedConfigLoader } from '@/loaders/config';
import { createMetaLoader } from '@/loaders/meta';

const FumadocsDeps = ['fumadocs-core', 'fumadocs-ui', 'fumadocs-openapi'];

export interface PluginOptions {
  /**
   * Automatically generate index files for accessing files with `import.meta.glob`.
   *
   * @defaultValue true
   */
  generateIndexFile?: boolean | IndexFileOptions;

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
  config: Record<string, unknown>,
  pluginOptions: PluginOptions = {},
): Promise<Plugin> {
  const options = applyDefaults(pluginOptions);
  const core = await createViteCore(options).init({
    config: buildConfig(config),
  });
  const configLoader = createIntegratedConfigLoader(core);
  const mdxLoader = toVite(createMdxLoader(configLoader));
  const metaLoader = toVite(
    createMetaLoader(configLoader, {
      // vite has built-in plugin for JSON files
      json: 'js',
    }),
  );

  return {
    name: 'fumadocs-mdx',
    // needed, otherwise other plugins will be executed before our `transform`.
    enforce: 'pre',
    config(config) {
      if (!options.updateViteConfig) return config;

      return mergeConfig(config, {
        optimizeDeps: {
          exclude: FumadocsDeps,
        },
        resolve: {
          noExternal: FumadocsDeps,
          dedupe: FumadocsDeps,
        },
      } satisfies UserConfig);
    },
    async buildStart() {
      await core.emitAndWrite();
    },
    async configureServer(server) {
      await core.initServer({
        watcher: server.watcher as unknown as FSWatcher,
      });
    },
    async transform(value, id) {
      try {
        if (metaLoader.filter(id)) {
          return await metaLoader.transform.call(this, value, id);
        }

        if (mdxLoader.filter(id)) {
          return await mdxLoader.transform.call(this, value, id);
        }
      } catch (e) {
        if (e instanceof ValidationError) {
          throw new Error(e.toStringFormatted());
        }

        throw e;
      }
    },
  };
}

export async function postInstall(
  configPath = findConfigFile(),
  pluginOptions: PluginOptions = {},
) {
  const { loadConfig } = await import('@/config/load-from-file');
  const options = applyDefaults(pluginOptions);
  const core = await createViteCore(options).init({
    config: loadConfig(configPath, options.outDir, true),
  });

  await core.emitAndWrite();
}

function createViteCore({
  configPath,
  outDir,
  generateIndexFile,
}: Required<PluginOptions>) {
  return createCore(
    {
      environment: 'vite',
      configPath,
      outDir,
    },
    [
      vite({
        index: generateIndexFile,
      }),
    ],
  );
}

function applyDefaults(options: PluginOptions): Required<PluginOptions> {
  return {
    updateViteConfig: options.updateViteConfig ?? true,
    generateIndexFile: options.generateIndexFile ?? true,
    configPath: options.configPath ?? 'source.config.ts',
    outDir: options.outDir ?? '.source',
  };
}
