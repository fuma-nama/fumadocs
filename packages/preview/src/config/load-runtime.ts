import { revalidable } from '@/lib/revalidable.js';
import { AppConfig, configSchema, type ParsedAppConfig } from './global.js';
import { parseConfig, findConfigPath } from './load-node.js';
import { pathToFileURL } from 'node:url';

function getDefaultConfig() {
  return configSchema.parse({} satisfies AppConfig);
}

async function loadConfig(configPath: string | null): Promise<ParsedAppConfig> {
  if (configPath === null) return getDefaultConfig();

  try {
    const module = await import(/* @vite-ignore */ pathToFileURL(configPath).href);

    return parseConfig(configPath, module.default ?? module);
  } catch (error) {
    console.error(
      `Failed to load config from ${configPath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return getDefaultConfig();
  }
}

export const getConfigRuntime = revalidable({
  async create() {
    const configPath = await findConfigPath();
    return await loadConfig(configPath);
  },
});
