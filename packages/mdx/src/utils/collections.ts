import type { DocCollection, MetaCollection } from '@/config/define';
import picomatch from 'picomatch';

export function getSupportedFormats(
  collection: DocCollection | MetaCollection,
) {
  return {
    doc: ['mdx', 'md'],
    meta: ['json', 'yaml'],
  }[collection.type];
}

export function getGlobPatterns(
  collection: MetaCollection | DocCollection,
): string[] {
  if (collection.files) return collection.files;
  return [`**/*.{${getSupportedFormats(collection).join(',')}}`];
}

export function isFileSupported(
  filePath: string,
  collection: MetaCollection | DocCollection,
) {
  for (const format of getSupportedFormats(collection)) {
    if (filePath.endsWith(`.${format}`)) return true;
  }

  return false;
}

export function isFileInCollection(
  file: string,
  collection: DocCollection | MetaCollection,
): boolean {
  if (!isFileSupported(file, collection)) return false;

  const patterns = getGlobPatterns(collection);
  const isMatch = picomatch(patterns, {
    cwd: Array.isArray(collection.dir) ? collection.dir[0] : collection.dir,
  });

  return isMatch(file);
}
