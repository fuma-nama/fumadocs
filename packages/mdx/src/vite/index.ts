import {
  mergeConfig,
  type Plugin,
  type TransformResult,
  type UserConfig,
} from 'vite';
import { buildConfig } from '@/config/build';
import { parse } from 'node:querystring';
import { validate, ValidationError } from '@/utils/validation';
import * as path from 'node:path';
import { load } from 'js-yaml';
import { createMdxLoader } from '@/loaders/mdx';
import { findConfigFile, resolvedConfig } from '@/loaders/config';
import { toVite } from '@/loaders/adapter';
import vite, { type IndexFileOptions } from '@/plugins/vite';
import type { FSWatcher } from 'chokidar';
import { createCore } from '@/core';

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
  const mdxLoader = toVite(createMdxLoader(resolvedConfig(core.getConfig())));

  async function transformMeta(
    path: string,
    query: string,
    value: string,
  ): Promise<TransformResult | null> {
    const isJson = path.endsWith('.json');
    const parsed = parse(query) as {
      collection?: string;
    };

    const collection = parsed.collection
      ? core.getConfig().collections.get(parsed.collection)
      : undefined;
    if (!collection) return null;
    let schema;
    switch (collection.type) {
      case 'meta':
        schema = collection.schema;
        break;
      case 'docs':
        schema = collection.meta.schema;
        break;
    }
    if (!schema) return null;

    let data;
    try {
      data = isJson ? JSON.parse(value) : load(value);
    } catch {
      return null;
    }

    const out = await validate(
      schema,
      data,
      { path, source: value },
      `invalid data in ${path}`,
    );

    return {
      code: isJson
        ? JSON.stringify(out)
        : `export default ${JSON.stringify(out)}`,
      map: null,
    };
  }

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
      const [file, query = ''] = id.split('?');
      const ext = path.extname(file);

      try {
        if (['.yaml', '.json'].includes(ext))
          return await transformMeta(file, query, value);

        if (['.md', '.mdx'].includes(ext))
          return await mdxLoader.call(this, file, query, value);
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
  const { loadConfig } = await import('@/loaders/config/load');
  const options = applyDefaults(pluginOptions);
  const core = await createViteCore(options).init({
    config: loadConfig(configPath, options.outDir, true),
  });

  await core.emitAndWrite();
  console.log('[MDX] generated');
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
      generateIndexFile !== false &&
        vite(typeof generateIndexFile === 'object' ? generateIndexFile : {}),
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
