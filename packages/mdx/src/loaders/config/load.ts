import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildConfig } from '@/config/build';
import type { LoadedConfig } from '@/loaders/config';

let cache: {
  hash: string;
  config: Promise<LoadedConfig>;
} | null = null;

async function compileConfig(configPath: string, outDir: string) {
  const { build } = await import('esbuild');

  const transformed = await build({
    entryPoints: [{ in: configPath, out: 'source.config' }],
    bundle: true,
    outdir: outDir,
    target: 'node20',
    write: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    outExtension: {
      '.js': '.mjs',
    },
    allowOverwrite: true,
  });

  if (transformed.errors.length > 0) {
    throw new Error('failed to compile configuration file');
  }
}

/**
 * Load config
 *
 * @param configPath - config path
 * @param outDir - output directory
 * @param hash - hash of config content
 * @param build - By default, it assumes the TypeScript config has been compiled to `.source/source.config.mjs`. Set this `true` to compile the config first.
 */
export async function loadConfig(
  configPath: string,
  outDir: string,
  hash?: string,
  build = false,
): Promise<LoadedConfig> {
  if (cache && cache.hash === hash) {
    return await cache.config;
  }

  if (build) await compileConfig(configPath, outDir);

  const url = pathToFileURL(path.resolve(outDir, 'source.config.mjs'));

  const config = import(`${url.href}?hash=${hash}`).then((loaded) => {
    return buildConfig(
      // every call to `loadConfig` will cause the previous cache to be ignored
      loaded as Record<string, unknown>,
    );
  });

  if (hash) cache = { config, hash };
  return await config;
}

/**
 * Generate hash based on the content of config
 */
export async function getConfigHash(configPath: string): Promise<string> {
  const stats = await fs.stat(configPath).catch(() => undefined);

  if (stats) {
    return stats.mtime.getTime().toString();
  }

  throw new Error('Cannot find config file');
}
