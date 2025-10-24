import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/loaders/config';
import { EmitEntry, Plugin, PluginContext, PluginOption } from '@/plugins';
import type { FSWatcher } from 'chokidar';

export interface ServerContext {
  watcher?: FSWatcher;
}

export function createCore(
  context: PluginContext,
  defaultPlugins: PluginOption[] = [],
) {
  let config: LoadedConfig;
  let plugins: Plugin[];

  async function write(entry: EmitEntry) {
    const file = path.join(context.outDir, entry.path);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, entry.content);
  }

  return {
    async init(options: { config: LoadedConfig | Promise<LoadedConfig> }) {
      config = await options.config;
      plugins = [];

      for await (const option of [
        ...defaultPlugins,
        ...(config.global.plugins ?? []),
      ]) {
        if (!option) continue;
        if (Array.isArray(option)) plugins.push(...option);
        else plugins.push(option);
      }

      for (const plugin of plugins) {
        const out = await plugin.config?.call(context, config);
        if (out) config = out;
      }

      return this;
    },
    getConfig() {
      return config;
    },
    async initServer(server: ServerContext) {
      for (const plugin of plugins) {
        await plugin.configureServer?.call(context, server);
      }
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
