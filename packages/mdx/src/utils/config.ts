import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type {
  DocCollection,
  DocsCollection,
  MetaCollection,
} from '@/config/define';
import { type GlobalConfig } from '@/config/types';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { pathToFileURL } from 'node:url';
import { buildConfig } from '@/config/build';
import type { MDXOptions as RemoteMdxOptions } from '@fumadocs/mdx-remote';

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export interface LoadedConfig {
  collections: Map<string, DocCollection | MetaCollection | DocsCollection>;

  global?: GlobalConfig;

  _mdx_loader?: {
    cachedOptions?: ProcessorOptions;
  };

  _mdx_async?: {
    cachedMdxOptions?: RemoteMdxOptions;
  };
}

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
    target: 'node18',
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
 * @param hash - hash of config content
 * @param build - By default, it assumes the TypeScript config has been compiled to `.source/source.config.mjs`. Set this `true` to compile the config first.
 */
export async function loadConfig(
  configPath: string,
  hash: string,
  build = false,
): Promise<LoadedConfig> {
  if (cache && cache.hash === hash) {
    return await cache.config;
  }

  if (build) await compileConfig(configPath, '.source');

  const url = pathToFileURL(path.resolve('.source/source.config.mjs'));

  const config = import(`${url.href}?hash=${hash}`).then((loaded) => {
    const [err, config] = buildConfig(
      // every call to `loadConfig` will cause the previous cache to be ignored
      loaded as Record<string, unknown>,
    );

    if (err !== null) throw new Error(err);
    return config;
  });

  cache = { config, hash };
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
