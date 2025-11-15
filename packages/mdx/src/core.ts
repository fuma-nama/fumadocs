import type {
  DocCollectionItem,
  LoadedConfig,
  MetaCollectionItem,
} from '@/config/build';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { FSWatcher } from 'chokidar';
import { removeFileCache } from './utils/codegen/cache';
import { validate } from './utils/validation';
import type { VFile } from 'vfile';

type Awaitable<T> = T | Promise<T>;

export interface EmitEntry {
  /**
   * path relative to output directory
   */
  path: string;
  content: string;
}

export interface PluginContext extends CoreOptions {
  core: Core;
}

export interface Plugin {
  name?: string;

  /**
   * on config loaded/updated
   */
  config?: (
    this: PluginContext,
    config: LoadedConfig,
  ) => Awaitable<void | LoadedConfig>;

  /**
   * Generate files (e.g. types, index file, or JSON schemas)
   */
  emit?: (this: PluginContext) => Awaitable<EmitEntry[]>;

  /**
   * Configure Fumadocs dev server
   */
  configureServer?: (
    this: PluginContext,
    server: ServerContext,
  ) => Awaitable<void>;

  /**
   * Transform frontmatter/metadata
   */
  metadata?: (
    this: PluginContext & {
      collection: DocCollectionItem | MetaCollectionItem;
      filePath: string;
    },
    data: unknown,
  ) => Awaitable<unknown | void>;

  doc?: {
    /**
     * Transform `vfile` on compilation stage
     */
    vfile?: (
      this: PluginContext & {
        collection: DocCollectionItem;
        filePath: string;
      },
      file: VFile,
    ) => Awaitable<VFile | void>;
  };
}

export type PluginOption = Awaitable<Plugin | PluginOption[] | false>;

export interface ServerContext {
  /**
   * the file watcher, by default all content files are watched, along with other files.
   *
   * make sure to filter when listening to events
   */
  watcher?: FSWatcher;
}

export interface CoreOptions {
  environment: string;
  configPath: string;
  outDir: string;
}

export interface EmitOptions {
  /**
   * filter the plugins to run emit
   */
  filterPlugin?: (plugin: Plugin) => boolean;
}

export const _Defaults = {
  configPath: 'source.config.ts',
  outDir: '.source',
};

async function getPlugins(pluginOptions: PluginOption[]): Promise<Plugin[]> {
  const plugins: Plugin[] = [];

  for await (const option of pluginOptions) {
    if (!option) continue;
    if (Array.isArray(option)) plugins.push(...(await getPlugins(option)));
    else plugins.push(option);
  }

  return plugins;
}

export function createCore(
  options: CoreOptions,
  defaultPlugins: PluginOption[] = [],
) {
  let config: LoadedConfig;
  let plugins: Plugin[];

  function createPluginContext(): PluginContext {
    return {
      core,
      ...options,
    };
  }

  const core = {
    _options: options,
    /**
     * Convenient cache store, reset when config changes
     */
    cache: new Map<string, unknown>(),
    async init({ config: newConfig }: { config: Awaitable<LoadedConfig> }) {
      config = await newConfig;
      this.cache.clear();
      plugins = await getPlugins([
        ...defaultPlugins,
        ...(config.global.plugins ?? []),
      ]);

      const ctx = createPluginContext();
      for (const plugin of plugins) {
        const out = await plugin.config?.call(ctx, config);
        if (out) config = out;
      }

      return this;
    },
    getConfig(): LoadedConfig {
      return config;
    },
    /**
     * The file path of compiled config file, the file may not exist (e.g. on Vite, or still compiling)
     */
    getCompiledConfigPath(): string {
      return path.join(options.outDir, 'source.config.mjs');
    },
    async initServer(server: ServerContext): Promise<void> {
      server.watcher?.on('all', async (event, file) => {
        if (event === 'change') removeFileCache(file);
      });

      const ctx = createPluginContext();
      for (const plugin of plugins) {
        await plugin.configureServer?.call(ctx, server);
      }
    },
    async emit({ filterPlugin = () => true }: EmitOptions = {}): Promise<
      EmitEntry[]
    > {
      const ctx = createPluginContext();

      return (
        await Promise.all(
          plugins.map((plugin) => {
            if (!filterPlugin(plugin) || !plugin.emit) return [];

            return plugin.emit.call(ctx);
          }),
        )
      ).flat();
    },
    async emitAndWrite(emitOptions?: EmitOptions): Promise<void> {
      const start = performance.now();
      const out = await this.emit(emitOptions);

      await Promise.all(
        out.map(async (entry) => {
          const file = path.join(options.outDir, entry.path);

          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, entry.content);
        }),
      );
      console.log(`[MDX] generated files in ${performance.now() - start}ms`);
    },
    async metadata(
      collection: DocCollectionItem | MetaCollectionItem,
      filePath: string,
      source: string,
      data: unknown,
    ) {
      if (collection.schema) {
        data = await validate(
          collection.schema,
          data,
          { path: filePath, source },
          collection.type === 'doc'
            ? `invalid frontmatter in ${filePath}`
            : `invalid data in ${filePath}`,
        );
      }

      const ctx = {
        ...createPluginContext(),
        filePath,
        collection,
      };

      for (const plugin of plugins) {
        data = (await plugin.metadata?.call(ctx, data)) ?? data;
      }

      return data;
    },
    doc: {
      async vfile(
        collection: DocCollectionItem,
        filePath: string,
        file: VFile,
      ): Promise<VFile> {
        const ctx = {
          ...createPluginContext(),
          filePath,
          collection,
        };

        for (const plugin of plugins) {
          file = (await plugin.doc?.vfile?.call(ctx, file)) ?? file;
        }

        return file;
      },
    },
  };

  return core;
}

export type Core = ReturnType<typeof createCore>;
