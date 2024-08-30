import { loadConfig, type LoadedConfig } from '@/config/load';

const cache = new Map<
  string,
  {
    hash: string;
    config: Promise<LoadedConfig>;
  }
>();

export async function loadConfigCached(
  configPath: string,
  hash: string,
): Promise<LoadedConfig> {
  const cached = cache.get(configPath);
  if (cached && cached.hash === hash) {
    return await cached.config;
  }

  const config = loadConfig(configPath);
  cache.set(configPath, { config, hash });
  return await config;
}

export function invalidateCache(configPath: string): void {
  cache.delete(configPath);
}
