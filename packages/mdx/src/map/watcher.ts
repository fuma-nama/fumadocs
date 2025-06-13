import { FSWatcher } from 'chokidar';
import { type LoadedConfig } from '@/utils/config';

export function watcher(
  configPath: string,
  config: LoadedConfig,
  ignored: string[],
): FSWatcher {
  const watcher = new FSWatcher({
    ignoreInitial: true,
    persistent: true,
    ignored,
  });

  watcher.add(configPath);

  for (const collection of config.collections.values()) {
    if (collection.type === 'docs') {
      watcher.add(collection.docs.dir);
      watcher.add(collection.meta.dir);
    } else {
      watcher.add(collection.dir);
    }
  }

  return watcher;
}
