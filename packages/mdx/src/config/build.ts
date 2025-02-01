import type { GlobalConfig } from '@/config/types';
import type { ProcessorOptions } from '@mdx-js/mdx';
import {
  InternalDocCollection,
  InternalMetaCollection,
  LoadedConfig,
} from '@/utils/load-config';

export function buildConfig(
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

  let cachedMdxOptions: ProcessorOptions | undefined;

  return [
    null,
    {
      global: globalConfig,
      collections,
      async getDefaultMDXOptions() {
        if (cachedMdxOptions) return cachedMdxOptions;
        const { getDefaultMDXOptions } = await import('@/utils/mdx-options');

        const mdxOptions = globalConfig?.mdxOptions ?? {};
        if (typeof mdxOptions === 'function') {
          cachedMdxOptions = getDefaultMDXOptions(await mdxOptions());
        } else {
          cachedMdxOptions = getDefaultMDXOptions(mdxOptions);
        }

        return cachedMdxOptions;
      },
      _runtime: {
        files: new Map(),
      },
    },
  ];
}
