import path from 'node:path';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config';
import type { ProcessorOptions } from '@mdx-js/mdx';
import fs from 'node:fs/promises';
import type { Core } from '@/core';

export interface ConfigLoader {
  getConfig: () => LoadedConfig | Promise<LoadedConfig>;
}

export interface LoadedConfig {
  collections: Map<string, DocCollection | MetaCollection | DocsCollection>;

  global: GlobalConfig;
  getDefaultMDXOptions(mode?: 'default' | 'remote'): Promise<ProcessorOptions>;
}

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export function staticConfig({
  core,
  buildConfig,
}: {
  core: Core;
  buildConfig: boolean;
}): ConfigLoader {
  let cached: Promise<LoadedConfig> | undefined;
  async function newConfig() {
    const { loadConfig } = await import('./load');
    await core.init({
      config: loadConfig(
        core._options.configPath,
        core._options.outDir,
        buildConfig,
      ),
    });

    return core.getConfig();
  }

  return {
    async getConfig() {
      return (cached ??= newConfig());
    },
  };
}

export function dynamicConfig({
  core,
  buildConfig,
}: {
  core: Core;
  buildConfig: boolean;
}): ConfigLoader {
  let loaded: { config: Promise<LoadedConfig>; hash: string } | undefined;

  async function getConfigHash(): Promise<string> {
    const stats = await fs
      .stat(core._options.configPath)
      .catch(() => undefined);

    if (stats) {
      return stats.mtime.getTime().toString();
    }

    throw new Error('Cannot find config file');
  }

  async function newConfig() {
    const { loadConfig } = await import('./load');
    await core.init({
      config: loadConfig(
        core._options.configPath,
        core._options.outDir,
        buildConfig,
      ),
    });

    return core.getConfig();
  }

  return {
    async getConfig() {
      const hash = await getConfigHash();
      if (loaded && loaded.hash === hash) return loaded.config;

      loaded = {
        hash,
        config: newConfig(),
      };
      return loaded.config;
    },
  };
}
