import path from 'node:path';
import micromatch from 'micromatch';
import { type LoadedConfig } from '@/config/load';
import { type SupportedType } from '@/config/types';

export function findCollectionId(
  config: LoadedConfig,
  file: string,
  type: SupportedType,
): string | undefined {
  const cached = config._runtime.files.get(file);

  if (cached) return cached;

  for (const [name, collection] of config.collections.entries()) {
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

    config._runtime.files.set(file, name);
    return name;
  }
}
