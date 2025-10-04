import { type FileInfo, getSlugs, parseFilePath } from '@/source';
import type { LoaderPlugin } from '@/source/plugins';
import { basename, extname } from '@/source/path';

/**
 * Generate slugs for pages if missing
 */
export function slugsPlugin(
  slugsFn?: (info: FileInfo) => string[],
): LoaderPlugin {
  function isIndex(file: string) {
    return basename(file, extname(file)) === 'index';
  }

  return {
    name: 'fumadocs:slugs',
    transformStorage({ storage }) {
      const indexFiles = new Set<string>();
      const taken = new Set<string>();
      // for custom slugs function, don't handle conflicting cases like `dir/index.mdx` vs `dir.mdx`
      const autoIndex = slugsFn === undefined;

      for (const path of storage.getFiles()) {
        const file = storage.read(path);
        if (!file || file.format !== 'page' || file.slugs) continue;

        if (isIndex(path) && autoIndex) {
          indexFiles.add(path);
          continue;
        }

        file.slugs = slugsFn ? slugsFn(parseFilePath(path)) : getSlugs(path);

        const key = file.slugs.join('/');
        if (taken.has(key)) throw new Error('Duplicated slugs');
        taken.add(key);
      }

      for (const path of indexFiles) {
        const file = storage.read(path);
        if (file?.format !== 'page') continue;

        file.slugs = getSlugs(path);
        if (taken.has(file.slugs.join('/'))) file.slugs.push('index');
      }
    },
  };
}
