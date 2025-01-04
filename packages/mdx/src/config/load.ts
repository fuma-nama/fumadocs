import * as path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createJiti } from 'jiti';
import type { DocCollection, MetaCollection } from '@/config/define';
import { type GlobalConfig } from '@/config/types';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { getDefaultMDXOptions } from '@/utils/mdx-options';

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

const jiti = createJiti(import.meta.url, {
  moduleCache: false,
});

export async function loadConfig(configPath: string): Promise<LoadedConfig> {
  const imported = await jiti
    .import(pathToFileURL(configPath).href)
    .catch((e) => {
      throw new Error('failed to compile configuration file', e);
    });

  const [err, config] = buildConfig(
    // every call to `loadConfig` will cause the previous cache to be ignored
    imported as Record<string, unknown>,
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
