import { getConfigHash, loadConfig, LoadedConfig } from '@/utils/config';

export interface ConfigLoader {
  getConfig: (hash?: string) => LoadedConfig | Promise<LoadedConfig>;
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
      return loadConfig(
        configPath,
        outDir,
        hash ?? (await getConfigHash(configPath)),
      );
    },
  };
}
