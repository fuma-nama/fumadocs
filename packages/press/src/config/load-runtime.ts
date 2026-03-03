import { defineConfig, type FumapressConfig } from './global.js';
import { checkConfig, findConfigPath } from './load-node.js';
import { unrun } from 'unrun';

const DefaultConfig = defineConfig();

async function loadConfig(configPath: string | null): Promise<FumapressConfig> {
  if (configPath === null) return DefaultConfig;

  try {
    const { module } = await unrun<{ default: unknown }>({
      path: configPath,
      inputOptions: {
        cwd: process.env.PROJECT_DIR,
        external: ['*'],
      },
    });

    return checkConfig(configPath, module.default ?? module);
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
