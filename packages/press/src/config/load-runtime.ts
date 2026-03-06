import { revalidable } from '@/lib/revalidable.js';
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
        cwd: process.env.ROOT_DIR,
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

export const getConfigRuntime = revalidable({
  async create() {
    const configPath = await findConfigPath();
    return await loadConfig(configPath);
  },
});
