import { loadConfig, type LoadedConfig } from '@/config/load';

export const cache = new Map<string, LoadedConfig>();

export async function loadConfigCached(
  configPath: string,
): Promise<LoadedConfig> {
  const cached = cache.get(configPath);
  if (cached) return cached;

  const config = await loadConfig(configPath);
  cache.set(configPath, config);
  return config;
}
