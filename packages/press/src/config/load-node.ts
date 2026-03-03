import { glob } from 'tinyglobby';
import type { FumapressConfig } from './global';

/**
 * Default glob patterns for finding config file
 */
const DefaultConfigPatterns = ['fumapress.config.{js,jsx,ts,tsx}'];

export async function findConfigPath(): Promise<string | null> {
  const paths = await glob(DefaultConfigPatterns, {
    cwd: process.env.PROJECT_DIR,
    absolute: true,
  });

  return paths.length > 0 ? paths[0]! : null;
}

export function checkConfig(loaded: unknown): FumapressConfig {
  if (typeof loaded !== 'object' || loaded === null) {
    throw new Error(`Config file ${loaded} must export an object.`);
  }

  return loaded as FumapressConfig;
}
