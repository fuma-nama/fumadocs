import { type FSWatcher, watch } from 'chokidar';
import { type LoadedConfig } from '@/config/load';

export function watcher(configPath: string, config: LoadedConfig): FSWatcher {
  const deps: string[] = [configPath];

  for (const collection of config.collections.values()) {
    if (Array.isArray(collection.dir)) deps.push(...collection.dir);
    else deps.push(collection.dir);
  }

  return watch(deps, {
    ignoreInitial: true,
  });
}
