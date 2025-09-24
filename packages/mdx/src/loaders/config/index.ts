import path from 'node:path';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config';
import type { ProcessorOptions } from '@mdx-js/mdx';

export interface ConfigLoader {
  getConfig: (hash?: string) => LoadedConfig | Promise<LoadedConfig>;
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

export function dynamicConfig(
  configPath: string,
  outDir: string,
): ConfigLoader {
  return {
    async getConfig(hash) {
      const { loadConfig, getConfigHash } = await import('./load');

      return loadConfig(
        configPath,
        outDir,
        hash ?? (await getConfigHash(configPath)),
      );
    },
  };
}
