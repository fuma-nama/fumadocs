import path from 'node:path';
import micromatch from 'micromatch';
import { type LoadedConfig } from '@/config/load';
import { type Collections, type SupportedType } from '@/config/collections';

export function findCollection(
  config: LoadedConfig,
  file: string,
  type: SupportedType,
): Collections | undefined {
  return Object.values(config).find((collection) => {
    if (collection.type !== type) return false;
    const dirs = Array.isArray(collection.dir)
      ? collection.dir
      : [collection.dir];

    const isIncluded = collection.files
      ? micromatch.isMatch(file, collection.files)
      : true;
    if (!isIncluded) return false;

    return dirs.some((dir) => {
      const relative = path.relative(dir, path.dirname(file));

      return !relative.startsWith('..') && !path.isAbsolute(relative);
    });
  });
}
