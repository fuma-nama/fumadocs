import { type FSWatcher, watch } from 'chokidar';
import { type LoadedConfig } from '@/utils/config';

export function watcher(configPath: string, config: LoadedConfig): FSWatcher {
  const deps: string[] = [configPath];

  function add(dir: string | string[]) {
    if (Array.isArray(dir)) deps.push(...dir);
    else deps.push(dir);
  }
  for (const collection of config.collections.values()) {
    if (collection.type === 'docs') {
      add(collection.docs.dir);
      add(collection.meta.dir);
    } else {
      add(collection.dir);
    }
  }

  return watch(deps, {
    ignoreInitial: true,
    persistent: true,
  });
}
