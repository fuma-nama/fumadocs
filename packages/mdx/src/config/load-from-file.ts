import { pathToFileURL } from 'node:url';
import type { LoadedConfig } from '@/config/build';
import { buildConfig } from '@/config/build';
import type { Core } from '@/core';

async function compileConfig(core: Core) {
  const { build } = await import('esbuild');
  const { configPath, outDir } = core.getOptions();

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
 * @param build - By default, it assumes the config file has been compiled. Set this `true` to compile the config first.
 */
export async function loadConfig(
  core: Core,
  build = false,
): Promise<LoadedConfig> {
  if (build) await compileConfig(core);

  const url = pathToFileURL(core.getCompiledConfigPath());
  // always return a new config
  url.searchParams.set('hash', Date.now().toString());

  const config = import(url.href).then((loaded) =>
    buildConfig(loaded as Record<string, unknown>),
  );

  return await config;
}
