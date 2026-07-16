import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config/build';
import { buildConfig } from '@/config/build';
import type { Core } from '@/core';

async function compileConfig(core: Core): Promise<boolean> {
  const { build } = await import('esbuild');

  let source: string;
  try {
    source = await fs.readFile(core.configPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const transformed = await build({
    stdin: {
      contents: source,
      sourcefile: path.basename(core.configPath),
      resolveDir: path.dirname(core.configPath),
      loader: core.configPath.endsWith('.js') || core.configPath.endsWith('.mjs') ? 'js' : 'ts',
    },
    bundle: true,
    outfile: path.join(core.outDir, 'source.config.mjs'),
    target: 'node22',
    write: true,
    platform: 'node',
    format: 'esm',
    packages: 'external',
    allowOverwrite: true,
  });

  if (transformed.errors.length > 0) {
    throw new Error('failed to compile configuration file');
  }

  return true;
}

/**
 * Load config
 *
 * @param build - By default, it assumes the config file has been compiled. Set this `true` to compile the config first.
 */
export async function loadConfig(core: Core, build = false): Promise<LoadedConfig> {
  let exists: boolean | undefined;
  if (build) {
    exists = await compileConfig(core);
  }

  exists ??= await fs.access(core.configPath).then(
    () => true,
    () => false,
  );

  if (!exists) return buildConfig({}, process.cwd());

  const url = pathToFileURL(core.getCompiledConfigPath());
  // always return a new config
  url.searchParams.set('hash', Date.now().toString());

  return buildConfig(await import(url.href), process.cwd());
}
