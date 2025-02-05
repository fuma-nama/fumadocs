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

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const { build } = await import('esbuild');

  const url = pathToFileURL(path.resolve('.source/source.config.mjs'));
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

  // every call to `loadConfig` should cause the previous cache to be ignored
  const loaded = await import(`${url.href}?hash=${Date.now().toString()}`);

  const [err, config] = buildConfig(
    // every call to `loadConfig` will cause the previous cache to be ignored
    loaded as Record<string, unknown>,
  );

  if (err !== null) throw new Error(err);
  return config;
}
