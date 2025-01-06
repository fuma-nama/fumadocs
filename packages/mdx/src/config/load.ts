import * as path from 'node:path';
import type { DocCollection, MetaCollection } from '@/config/define';
import { type GlobalConfig } from '@/config/types';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { getDefaultMDXOptions } from '@/utils/mdx-options';
import { pathToFileURL } from 'node:url';

export function findConfigFile(): string {
  return path.resolve('source.config.ts');
}

export interface LoadedConfig {
  collections: Map<string, InternalDocCollection | InternalMetaCollection>;
  defaultMdxOptions: ProcessorOptions;
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
    splitting: true,
  });

  if (transformed.errors.length > 0) {
    throw new Error('failed to compile configuration file');
  }

  const url = pathToFileURL(outputPath);
  const [err, config] = buildConfig(
    // every call to `loadConfig` will cause the previous cache to be ignored
    (await import(`${url.href}?hash=${Date.now().toString()}`)) as Record<
      string,
      unknown
    >,
  );

  if (err !== null) throw new Error(err);
  return config;
}

function buildConfig(
  config: Record<string, unknown>,
): [err: string, value: null] | [err: null, value: LoadedConfig] {
  const collections: LoadedConfig['collections'] = new Map();
  let globalConfig: LoadedConfig['global'];

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && '_doc' in v && v._doc === 'collections') {
      collections.set(
        k,
        v as unknown as InternalMetaCollection | InternalDocCollection,
      );
      continue;
    }

    if (k === 'default') {
      globalConfig = v as GlobalConfig;
      continue;
    }

    return [
      `Unknown export "${k}", you can only export collections from source configuration file.`,
      null,
    ];
  }

  return [
    null,
    {
      global: globalConfig,
      collections,
      defaultMdxOptions: getDefaultMDXOptions(globalConfig?.mdxOptions ?? {}),
      _runtime: {
        files: new Map(),
      },
    },
  ];
}
