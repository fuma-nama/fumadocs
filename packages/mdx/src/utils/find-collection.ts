import path from 'node:path';
import micromatch from 'micromatch';
import { type LoadedConfig } from '@/config/load';
import { type Collections } from '@/config/define';
import { type SupportedType } from '@/config/types';

export function findCollection(
  config: LoadedConfig,
  file: string,
  type: SupportedType,
): Collections | undefined {
  const cached = config._runtime.files.get(file);

  if (cached) return config.collections.get(cached);
  for (const collection of config.collections.values()) {
    if (collection.type !== type) continue;
    const dirs = Array.isArray(collection.dir)
      ? collection.dir
      : [collection.dir];

    const isInDir = dirs.some((dir) => {
      const relative = path.relative(dir, path.dirname(file));

      return !relative.startsWith('..') && !path.isAbsolute(relative);
    });
    if (!isInDir) continue;

    const isIncluded = collection.files
      ? micromatch.isMatch(file, collection.files)
      : true;
    if (!isIncluded) continue;

    return collection;
  }
}
