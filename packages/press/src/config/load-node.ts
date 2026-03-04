import { glob } from 'tinyglobby';
import { configSchema, type FumapressConfig } from './global';
import z from 'zod';

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

export function checkConfig(file: string, loaded: unknown): FumapressConfig {
  const result = configSchema.safeParse(loaded);

  if (result.error) {
    throw new Error(`The config file "${file}" is invalid:\n${z.prettifyError(result.error)}`, {
      cause: result.error,
    });
  }

  return result.data;
}
