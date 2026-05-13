import { configSchema, type ParsedAppConfig } from './global';
import z from 'zod';
import fs from 'node:fs';
import path from 'node:path';

export async function findConfigPath(): Promise<string | null> {
  const dir = process.env.ROOT_DIR ?? process.cwd();
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (/^fumadocs\.config\.(js|jsx|ts|tsx)$/.test(file)) {
      return path.resolve(dir, file);
    }
  }

  return null;
}

export function parseConfig(file: string, loaded: unknown): ParsedAppConfig {
  const result = configSchema.safeParse(loaded);

  if (result.error) {
    throw new Error(`The config file "${file}" is invalid:\n${z.prettifyError(result.error)}`, {
      cause: result.error,
    });
  }

  return result.data;
}
