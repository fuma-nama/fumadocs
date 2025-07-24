import type { DocCollection, MetaCollection } from '@/config/define';

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
