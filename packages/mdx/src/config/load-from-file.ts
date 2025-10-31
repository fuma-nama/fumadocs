import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { LoadedConfig } from '@/config/build';
import { buildConfig } from '@/config/build';

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
 * @param build - By default, it assumes the TypeScript config has been compiled to `.source/source.config.mjs`. Set this `true` to compile the config first.
 */
export async function loadConfig(
  configPath: string,
  outDir: string,
  build = false,
): Promise<LoadedConfig> {
  if (build) await compileConfig(configPath, outDir);

  const url = pathToFileURL(path.resolve(outDir, 'source.config.mjs'));
  // always return a new config
  url.searchParams.set('hash', Date.now().toString());

  const config = import(url.href).then((loaded) =>
    buildConfig(loaded as Record<string, unknown>),
  );

  return await config;
}
