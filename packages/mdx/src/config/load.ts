import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { validateConfig } from '@/config/validate';
import type { DocCollection, MetaCollection } from '@/config/define';
import { type GlobalConfig } from '@/config/types';

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export interface LoadedConfig {
  collections: Map<string, InternalDocCollection | InternalMetaCollection>;
  global?: GlobalConfig;

  _runtime: {
    /**
     * Absolute file path and their associated collections
     */
    files: Map<string, string>;
  };
}

export type InternalDocCollection = DocCollection;
export type InternalMetaCollection = MetaCollection;

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const outputPath = path.resolve('.source/source.config.mjs');

  const transformed = await build({
    entryPoints: [{ in: configPath, out: 'source.config' }],
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
    allowOverwrite: true,
    splitting: true,
  });

  if (transformed.errors.length > 0) {
    throw new Error('failed to compile configuration file');
  }

  const url = pathToFileURL(outputPath);
  const [err, config] = validateConfig(
    // every call to `loadConfig` will cause the previous cache to be ignored
    (await import(`${url.toString()}?hash=${Date.now().toString()}`)) as Record<
      string,
      unknown
    >,
  );

  if (err !== null) throw new Error(err);
  return config;
}
