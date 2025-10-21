import path from 'node:path';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config';
import type { ProcessorOptions } from '@mdx-js/mdx';
import fs from 'node:fs/promises';

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

export function resolvedConfig(loaded: LoadedConfig): ConfigLoader {
  return {
    getConfig() {
      return loaded;
    },
  };
}

export function staticConfig({
  outDir,
  configPath,
  buildConfig,
}: {
  configPath: string;
  outDir: string;
  buildConfig: boolean;
}): ConfigLoader {
  let cached: Promise<LoadedConfig> | undefined;

  return {
    async getConfig() {
      if (cached) return cached;

      cached = import('./load').then((mod) =>
        mod.loadConfig(configPath, outDir, buildConfig),
      );

      return cached;
    },
  };
}

export function dynamicConfig({
  outDir,
  configPath,
  buildConfig,
}: {
  configPath: string;
  outDir: string;
  buildConfig: boolean;
}): ConfigLoader {
  let loaded: { config: Promise<LoadedConfig>; hash: string } | undefined;

  async function getConfigHash(): Promise<string> {
    const stats = await fs.stat(configPath).catch(() => undefined);

    if (stats) {
      return stats.mtime.getTime().toString();
    }

    throw new Error('Cannot find config file');
  }

  return {
    async getConfig() {
      const hash = await getConfigHash();
      if (loaded && loaded.hash === hash) return loaded.config;

      loaded = {
        hash,
        config: import('./load').then((mod) =>
          mod.loadConfig(configPath, outDir, buildConfig),
        ),
      };

      return loaded.config;
    },
  };
}
