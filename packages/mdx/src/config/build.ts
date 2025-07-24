import type { LoadedConfig } from '@/utils/config';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config/define';
import type { ProcessorOptions } from '@mdx-js/mdx';

export function buildConfig(
  config: Record<string, unknown>,
): [err: string, value: null] | [err: null, value: LoadedConfig] {
  const collections: LoadedConfig['collections'] = new Map();
  let globalConfig: LoadedConfig['global'];

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && 'type' in v) {
      if (v.type === 'docs') {
        collections.set(k, v as DocsCollection);
        continue;
      }

      if (v.type === 'doc' || v.type === 'meta') {
        collections.set(k, v as unknown as MetaCollection | DocCollection);
        continue;
      }
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

  let cachedMdxOptions: Promise<ProcessorOptions> | undefined;
  return [
    null,
    {
      global: globalConfig,
      collections,
      async getDefaultMDXOptions(): Promise<ProcessorOptions> {
        if (cachedMdxOptions) return cachedMdxOptions;

        const input = this.global?.mdxOptions;
        async function uncached(): Promise<ProcessorOptions> {
          const options = typeof input === 'function' ? await input() : input;
          const { getDefaultMDXOptions } = await import('@/utils/mdx-options');

          if (options?.preset === 'minimal') return options;
          return getDefaultMDXOptions(options ?? {});
        }

        return (cachedMdxOptions = uncached());
      },
    },
  ];
}
