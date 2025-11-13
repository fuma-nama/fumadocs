import type { LoadedConfig } from '@/config/build';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { FSWatcher } from 'chokidar';
import { removeFileCache } from './utils/codegen/cache';

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

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

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

  return {
    _options: options,
    getPluginContext(): PluginContext {
      return {
        core: this,
        ...options,
      };
    },
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
        const out = await plugin.config?.call(this.getPluginContext(), config);
        if (out) config = out;
      }

      return this;
    },
    getConfig(): LoadedConfig {
      return config;
    },
    async initServer(server: ServerContext): Promise<void> {
      server.watcher?.on('all', async (event, file) => {
        if (event === 'change') removeFileCache(file);
      });

      for (const plugin of plugins) {
        await plugin.configureServer?.call(this.getPluginContext(), server);
      }
    },
    async emit({ filterPlugin = () => true }: EmitOptions = {}): Promise<
      EmitEntry[]
    > {
      return (
        await Promise.all(
          plugins.map((plugin) => {
            if (!filterPlugin(plugin) || !plugin.emit) return [];

            return plugin.emit.call(this.getPluginContext());
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
  };
}

export type Core = ReturnType<typeof createCore>;
