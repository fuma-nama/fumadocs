import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { loadConfig, type LoadedConfig } from '@/utils/load-config';

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

/**
 * Generate hash based on the content of config
 */
export async function getConfigHash(configPath: string): Promise<string> {
  const hash = createHash('md5');
  const rs = fs.createReadStream(configPath);

  for await (const chunk of rs) {
    hash.update(chunk as string);
  }

  return hash.digest('hex');
}
