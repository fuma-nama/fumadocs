import * as path from 'node:path';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { type CompilerOptions } from 'typescript';
import { build } from 'esbuild';
import { type Config } from '@/config/types';
import { validateConfig } from '@/config/validate';

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export type LoadedConfig = Config;

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const outputPath = path.resolve('.source/source.config.mjs');

  const transformed = await build({
    entryPoints: [configPath],
    bundle: true,
    outdir: '.source',
    target: 'node18',
    write: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outExtension: {
      '.js': '.mjs',
    },
    splitting: true,
  });

  if (transformed.errors.length > 0) {
    throw new Error('failed to compile configuration file');
  }

  const [err, config] = validateConfig(
    (await import(outputPath)) as Record<string, unknown>,
  );

  if (err !== null) throw new Error(err);
  return config;
}

interface TSConfig {
  compilerOptions: CompilerOptions;
}

async function readTSConfig(cwd: string): Promise<TSConfig> {
  try {
    const contents = await readFile(join(cwd, 'tsconfig.json'), 'utf8');

    // Special case an empty file
    if (contents.trim() === '') {
      return { compilerOptions: {} };
    }

    return JSON.parse(contents) as TSConfig;
  } catch (error) {
    // ignore if tsconfig.json does not exist
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }

    return { compilerOptions: {} };
  }
}
