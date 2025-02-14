import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
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

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export interface LoadedConfig {
  collections: Map<string, DocCollection | MetaCollection | DocsCollection>;
  getDefaultMDXOptions: () => Promise<ProcessorOptions>;
  global?: GlobalConfig;

  _runtime: {
    /**
     * Absolute file path and their associated collections
     */
    files: Map<string, string>;
  };
}

let cache: {
  hash: string;
  config: Promise<LoadedConfig>;
} | null = null;

async function compileConfig(configPath: string) {
  const { build } = await import('esbuild');

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

  if (build) await compileConfig(configPath);

  const url = pathToFileURL(path.resolve('.source/source.config.mjs'));

  // every call to `loadConfig` should cause the previous cache to be ignored
  const config = import(`${url.href}?hash=${configPath}`).then((loaded) => {
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
  const hash = createHash('md5');
  const rs = fs.createReadStream(configPath);

  for await (const chunk of rs) {
    hash.update(chunk as string);
  }

  return hash.digest('hex');
}
