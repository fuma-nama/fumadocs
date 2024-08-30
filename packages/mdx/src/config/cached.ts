import { loadConfig, type LoadedConfig } from '@/config/load';

const cache = new Map<string, LoadedConfig>();

export async function loadConfigCached(
  configPath: string,
): Promise<LoadedConfig> {
  const cached = cache.get(configPath);
  if (cached) return cached;

  console.log('[MDX] load config');
  const config = await loadConfig(configPath);
  cache.set(configPath, config);
  return config;
}

export function invalidateCache(configPath: string): void {
  cache.delete(configPath);
}
