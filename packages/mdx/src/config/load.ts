import * as path from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { type CompilerOptions } from 'typescript';
import { type Options as SWCOptions, transform } from '@swc/core';
import { type Config } from '@/config/types';
import { validateConfig } from '@/config/validate';

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export type LoadedConfig = Config;

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const outputPath = path.resolve('.source/config.js');
  const configCode = await readFile(configPath).catch(() => null);

  if (!configCode) throw new Error('No configuration file found');

  const transformed = await transform(configCode.toString(), {
    ...resolveSWCOptions(
      process.cwd(),
      (await readTSConfig(process.cwd())).compilerOptions,
    ),
    outputPath,
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, transformed.code);

  const [err, config] = validateConfig(
    ((await import(outputPath)) as { default: Record<string, unknown> })
      .default,
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

function resolveSWCOptions(
  cwd: string,
  compilerOptions: CompilerOptions,
): SWCOptions {
  const resolvedBaseUrl = path.join(cwd, compilerOptions.baseUrl ?? '.');

  return {
    configFile: false,
    jsc: {
      target: 'es5',
      parser: {
        syntax: 'typescript',
      },
      paths: compilerOptions.paths,
      baseUrl: resolvedBaseUrl,
    },
    module: {
      type: 'commonjs',
    },
    sourceMaps: false,
    isModule: 'unknown',
  };
}
