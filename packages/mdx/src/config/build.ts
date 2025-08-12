import type { LoadedConfig } from '@/utils/config';
import type {
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config/define';
import type { ProcessorOptions } from '@mdx-js/mdx';

export function buildConfig(config: Record<string, unknown>): LoadedConfig {
  const collections: LoadedConfig['collections'] = new Map();
  let globalConfig: LoadedConfig['global'] = {};

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

    if (k === 'default' && v) {
      globalConfig = v as GlobalConfig;
      continue;
    }

    throw new Error(
      `Unknown export "${k}", you can only export collections from source configuration file.`,
    );
  }

  const mdxOptionsCache = new Map<string, Promise<ProcessorOptions>>();
  return {
    global: globalConfig,
    collections,
    async getDefaultMDXOptions(mode = 'default'): Promise<ProcessorOptions> {
      const cached = mdxOptionsCache.get(mode);
      if (cached) return cached;

      const input = this.global.mdxOptions;
      async function uncached(): Promise<ProcessorOptions> {
        const options = typeof input === 'function' ? await input() : input;
        const { getDefaultMDXOptions } = await import('@/utils/mdx-options');

        if (options?.preset === 'minimal') return options;
        return getDefaultMDXOptions({
          ...options,
          _withoutBundler: mode === 'remote',
        });
      }

      const result = uncached();
      mdxOptionsCache.set(mode, result);
      return result;
    },
  };
}
