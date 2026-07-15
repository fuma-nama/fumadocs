import { loadConfig } from '@/config/load-from-file';
import { buildConfig as buildEmptyConfig } from '@/config/build';
import type { Core } from '@/core';
import fs from 'node:fs/promises';

export interface ConfigLoader {
  getCore(): Promise<Core>;
}

type Hash = 'static' | 'missing' | number;

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
  let prev:
    | {
        hash: Hash;
        init: Promise<void>;
      }
    | undefined;

  async function getConfigHash(): Promise<Hash> {
    if (mode === 'production') return 'static';

    const stats = await fs.stat(core.configPath).catch(() => undefined);
    return stats ? stats.mtime.getTime() : 'missing';
  }

  async function load(hash: Hash) {
    // the config file is optional
    if (hash === 'missing') return buildEmptyConfig({}, process.cwd());

    return await loadConfig(core, buildConfig);
  }

  return {
    async getCore() {
      const hash = await getConfigHash();
      if (!prev || hash !== prev.hash) {
        prev = {
          hash,
          init: core.init({
            config: load(hash),
          }),
        };
      }

      await prev.init;
      return core;
    },
  };
}

/**
 * create config loader from initialized core
 */
export function createIntegratedConfigLoader(core: Core): ConfigLoader {
  return {
    async getCore() {
      return core;
    },
  };
}
