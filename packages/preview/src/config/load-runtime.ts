import { revalidable } from '@/lib/revalidable.js';
import { defineConfig, type AppConfig } from './global.js';
import { checkConfig, findConfigPath } from './load-node.js';
import { pathToFileURL } from 'node:url';

async function loadConfig(configPath: string | null): Promise<AppConfig> {
  if (configPath === null) return defineConfig();

  try {
    const module = await import(pathToFileURL(configPath).href);

    return checkConfig(configPath, module.default ?? module);
  } catch (error) {
    console.error(
      `Failed to load config from ${configPath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return defineConfig();
  }
}

export const getConfigRuntime = revalidable({
  async create() {
    const configPath = await findConfigPath();
    return await loadConfig(configPath);
  },
});
