import { defineConfig, type FumapressConfig } from './global.js';
import { pathToFileURL } from 'node:url';
import { checkConfig, findConfigPath } from './load-node.js';

const DefaultConfig = defineConfig();

async function loadConfig(configPath: string | null): Promise<FumapressConfig> {
  if (configPath === null) return DefaultConfig;

  try {
    // TODO: redesign config layer
    const { default: userConfig } = await import(pathToFileURL(configPath).href);

    return checkConfig(userConfig);
  } catch (error) {
    console.error(
      `Failed to load config from ${configPath}:`,
      error instanceof Error ? error.message : String(error),
    );
    return DefaultConfig;
  }
}

let cached: Promise<FumapressConfig> | undefined;

export function getConfigRuntime(): Promise<FumapressConfig> {
  if (cached) return cached;

  cached = (async () => {
    const configPath = await findConfigPath();
    return await loadConfig(configPath);
  })();
  return cached;
}
