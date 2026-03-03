import * as dotenv from 'dotenv';
import * as vite from 'vite';
import { defineConfig, type FumapressConfig } from '@/config/global';
import { checkConfig, findConfigPath } from '@/config/load-node';
import { pathToFileURL } from 'node:url';

export function loadEnv() {
  dotenv.config({ path: ['.env.local', '.env'], quiet: true });
}

export async function loadConfig(): Promise<FumapressConfig> {
  const configPath = await findConfigPath();
  if (configPath !== null) {
    const imported = await vite.runnerImport<{ default: FumapressConfig }>(
      pathToFileURL(configPath).href,
    );
    return checkConfig(configPath, imported.module.default);
  }

  return defineConfig();
}

export function overrideNodeEnv(nodeEnv: 'development' | 'production') {
  // set NODE_ENV before runnerImport https://github.com/vitejs/vite/issues/20299
  if (process.env.NODE_ENV && process.env.NODE_ENV !== nodeEnv) {
    console.warn(
      `Warning: NODE_ENV is set to '${process.env.NODE_ENV}', but overriding it to '${nodeEnv}'.`,
    );
  }
  process.env.NODE_ENV = nodeEnv;
}
