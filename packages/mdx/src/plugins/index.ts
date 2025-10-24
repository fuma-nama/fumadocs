import type { LoadedConfig } from '@/loaders/config';
import type { CoreOptions, ServerContext } from '@/core';

type Awaitable<T> = T | Promise<T>;

export interface EmitEntry {
  /**
   * path relative to output directory
   */
  path: string;
  content: string;
}

export type PluginContext = CoreOptions;

export interface Plugin {
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

export type PluginOption = Awaitable<Plugin | Plugin[] | false>;
