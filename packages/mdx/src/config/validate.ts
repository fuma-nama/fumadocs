import { type LoadedConfig } from '@/config/load';

export function validateConfig(
  config: Record<string, unknown>,
): [err: string, value: null] | [err: null, value: LoadedConfig] {
  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- remove property
      delete config[k];
      continue;
    }

    if (typeof v === 'object' && '_doc' in v && v._doc === 'collections')
      continue;

    return [
      `Unknown export "${k}", you can only export collections from source configuration file.`,
      null,
    ];
  }

  return [null, config as LoadedConfig];
}
