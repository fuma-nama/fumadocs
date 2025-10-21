import type { LoadedConfig } from '@/loaders/config';
import path from 'node:path';
import fs from 'node:fs/promises';

type Awaitable<T> = T | Promise<T>;

export interface EmitEntry {
  /**
   * path relative to output directory
   */
  path: string;
  content: string;
}

export interface PluginContext {
  environment: 'next' | 'vite';
  configPath: string;
  outDir: string;
}

export interface Plugin {
  /**
   * on config loaded
   */
  config?: (
    this: PluginContext,
    config: LoadedConfig,
  ) => Awaitable<void | LoadedConfig>;

  /**
   * Generate files (e.g. types, index file, or JSON schemas)
   */
  emit?: (this: PluginContext) => EmitEntry[] | Promise<EmitEntry[]>;
}

export type PluginOption = Awaitable<Plugin | Plugin[] | false>;

export function createPluginHandler(
  context: PluginContext,
  defaultPlugins: PluginOption[] = [],
) {
  const plugins: Plugin[] = [];

  async function write(entry: EmitEntry) {
    const file = path.join(context.outDir, entry.path);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, entry.content);
  }

  return {
    async init(config: LoadedConfig): Promise<LoadedConfig> {
      if (config.global.plugins) {
        defaultPlugins.push(...config.global.plugins);
      }

      for await (const option of defaultPlugins) {
        if (!option) continue;
        if (Array.isArray(option)) plugins.push(...option);
        else plugins.push(option);
      }

      for (const plugin of plugins) {
        const out = await plugin.config?.call(context, config);
        if (out) config = out;
      }

      return config;
    },
    async emit(): Promise<EmitEntry[]> {
      const out = await Promise.all(
        plugins.map((plugin) => {
          return plugin.emit?.call(context) ?? [];
        }),
      );

      return out.flat();
    },
    async emitAndWrite(): Promise<void> {
      const entries = await this.emit();

      await Promise.all(entries.map(write));
    },
  };
}
