import { type LoadedConfig } from '@/config/load';
import { type Collections } from '@/config/define';
import { type GlobalConfig } from '@/config/types';

export function validateConfig(
  config: Record<string, unknown>,
): [err: string, value: null] | [err: null, value: LoadedConfig] {
  const out: LoadedConfig = {
    collections: new Map(),
    _runtime: {
      files: new Map(),
    },
  };

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && '_doc' in v && v._doc === 'collections') {
      out.collections.set(k, v as unknown as Collections);
      continue;
    }

    if (k === 'default') {
      out.global = v as GlobalConfig;
      continue;
    }

    return [
      `Unknown export "${k}", you can only export collections from source configuration file.`,
      null,
    ];
  }

  return [null, out];
}
