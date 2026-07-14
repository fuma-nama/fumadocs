import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import type { LoadedConfig } from '@/config/build';
import { buildConfig } from '@/config/build';
import type { Core } from '@/core';

async function compileConfig(core: Core): Promise<boolean> {
  const { build } = await import('esbuild');
  const { configPath, outDir } = core.getOptions();

  let source: string;
  try {
    source = await fs.readFile(configPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const transformed = await build({
    stdin: {
      contents: source,
      sourcefile: path.basename(configPath),
      resolveDir: path.dirname(path.resolve(configPath)),
      loader: configPath.endsWith('.js') || configPath.endsWith('.mjs') ? 'js' : 'ts',
    },
    bundle: true,
    outfile: path.join(outDir, 'source.config.mjs'),
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
  if (build && !(await compileConfig(core))) return buildConfig({}, process.cwd());

  const url = pathToFileURL(core.getCompiledConfigPath());
  // always return a new config
  url.searchParams.set('hash', Date.now().toString());

  let loaded: Record<string, unknown>;
  try {
    loaded = await import(url.href);
  } catch (error) {
    if (build || (error as NodeJS.ErrnoException).code !== 'ERR_MODULE_NOT_FOUND') throw error;

    // the compiled config is absent: distinguish "no config file" from "not compiled yet"
    const exists = await fs.access(core.getOptions().configPath).then(
      () => true,
      () => false,
    );
    if (!exists) return buildConfig({}, process.cwd());

    throw new Error(
      `[MDX] ${core.getOptions().configPath} exists but its compiled output is missing, make sure the postinstall script of fumadocs-mdx has run.`,
      { cause: error },
    );
  }

  return buildConfig(loaded, process.cwd());
}
