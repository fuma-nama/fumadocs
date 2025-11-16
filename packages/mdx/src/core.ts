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

export type CompilationContext<Collection> = PluginContext &
  TransformOptions<Collection>;

export interface TransformOptions<Collection> {
  collection: Collection;
  filePath: string;
  source: string;
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

  meta?: {
    /**
     * Transform metadata
     */
    transform?: (
      this: CompilationContext<MetaCollectionItem>,
      data: unknown,
    ) => Awaitable<unknown | void>;
  };

  doc?: {
    /**
     * Transform frontmatter
     */
    frontmatter?: (
      this: CompilationContext<DocCollectionItem>,
      data: Record<string, unknown>,
    ) => Awaitable<Record<string, unknown> | void>;

    /**
     * Transform `vfile` on compilation stage
     */
    vfile?: (
      this: CompilationContext<DocCollectionItem>,
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

  async function transformMetadata<T>(
    {
      collection,
      filePath,
      source,
    }: TransformOptions<DocCollectionItem | MetaCollectionItem>,
    data: unknown,
  ): Promise<T> {
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

    return data as T;
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

      for (const plugin of plugins) {
        const out = await plugin.config?.call(pluginContext, config);
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

      for (const plugin of plugins) {
        await plugin.configureServer?.call(pluginContext, server);
      }
    },
    async emit({ filterPlugin = () => true }: EmitOptions = {}): Promise<
      EmitEntry[]
    > {
      return (
        await Promise.all(
          plugins.map((plugin) => {
            if (!filterPlugin(plugin) || !plugin.emit) return [];

            return plugin.emit.call(pluginContext);
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

    async transformMeta(
      options: TransformOptions<MetaCollectionItem>,
      data: unknown,
    ): Promise<unknown> {
      const ctx = {
        ...pluginContext,
        ...options,
      };

      data = await transformMetadata(options, data);
      for (const plugin of plugins) {
        if (plugin.meta?.transform)
          data = (await plugin.meta.transform.call(ctx, data)) ?? data;
      }

      return data;
    },
    async transformFrontmatter(
      options: TransformOptions<DocCollectionItem>,
      data: Record<string, unknown>,
    ): Promise<Record<string, unknown>> {
      const ctx = {
        ...pluginContext,
        ...options,
      };

      data = await transformMetadata(options, data);
      for (const plugin of plugins) {
        if (plugin.doc?.frontmatter)
          data = (await plugin.doc.frontmatter.call(ctx, data)) ?? data;
      }

      return data;
    },
    async transformVFile(
      options: TransformOptions<DocCollectionItem>,
      file: VFile,
    ): Promise<VFile> {
      const ctx = {
        ...pluginContext,
        ...options,
      };

      for (const plugin of plugins) {
        if (plugin.doc?.vfile)
          file = (await plugin.doc.vfile.call(ctx, file)) ?? file;
      }

      return file;
    },
  };

  // core & core options should be immutable, we can share it across all instances
  const pluginContext: PluginContext = {
    core,
    ...options,
  };

  return core;
}

export type Core = ReturnType<typeof createCore>;
