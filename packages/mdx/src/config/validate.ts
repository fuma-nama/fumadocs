import { z } from 'zod';
import { type LoadedConfig } from '@/config/load';
import { type Collections } from '@/config/define';
import { type DefaultMDXOptions } from '@/utils/mdx-options';
import { type GlobalConfig } from '@/config/types';

const defaultSchema = z.object({
  mdxOptions: z.custom<DefaultMDXOptions>().optional(),
});

export function validateConfig(
  config: Record<string, unknown>,
): [err: string, value: null] | [err: null, value: LoadedConfig] {
  let globalConfig: GlobalConfig | undefined;
  const collections = new Map<string, Collections>();

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && '_doc' in v && v._doc === 'collections') {
      collections.set(k, v as unknown as Collections);
      continue;
    }

    if (k === 'default') {
      globalConfig = defaultSchema.parse(v);
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
      collections,
      global: globalConfig,
      _runtime: {
        files: new Map(),
      },
    },
  ];
}
