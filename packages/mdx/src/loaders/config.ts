import type { Core } from '@/core';
import fs from 'node:fs/promises';

export interface ConfigLoader {
  getCore(): Promise<Core>;
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
  let prev:
    | {
        hash: string;
        init: Promise<void>;
      }
    | undefined;

  async function getConfigHash(): Promise<string> {
    if (mode === 'production') return 'static';

    const stats = await fs.stat(core.getOptions().configPath).catch(() => {
      throw new Error('Cannot find config file');
    });

    return stats.mtime.getTime().toString();
  }

  return {
    async getCore() {
      const hash = await getConfigHash();
      if (!prev || hash !== prev.hash) {
        prev = {
          hash,
          init: (async () => {
            const { loadConfig } = await import('../config/load-from-file');

            await core.init({
              config: loadConfig(core, buildConfig),
            });
          })(),
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
