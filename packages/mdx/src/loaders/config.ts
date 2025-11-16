import type { Core } from '@/core';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config/build';

export interface ConfigLoader {
  getConfig: () => LoadedConfig | Promise<LoadedConfig>;
  core: Core;
}

export function createStandaloneConfigLoader({
  core,
  buildConfig,
  mode,
}: {
  /**
   * core (not initialized)
   */
  core: Core;
  buildConfig: boolean;
  /**
   * In dev mode, the config file is dynamically re-loaded when it's updated.
   */
  mode: 'dev' | 'production';
}): ConfigLoader {
  let loaded: { config: Promise<LoadedConfig>; hash: string } | undefined;

  async function getConfigHash(): Promise<string> {
    if (mode === 'production') return 'static';

    const stats = await fs.stat(core._options.configPath).catch(() => {
      throw new Error('Cannot find config file');
    });

    return stats.mtime.getTime().toString();
  }

  async function newConfig() {
    const { loadConfig } = await import('../config/load-from-file');
    await core.init({
      config: loadConfig(core, buildConfig),
    });

    return core.getConfig();
  }

  return {
    core,
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

/**
 * create config loader from initialized core
 */
export function createIntegratedConfigLoader(core: Core): ConfigLoader {
  return {
    core,
    getConfig() {
      return core.getConfig();
    },
  };
}
