import type { LoaderPlugin } from '@/source/plugins';
import { basename, dirname, extname } from '@/source/path';

/**
 * Generate slugs for pages if missing
 */
export function slugsPlugin(
  slugsFn?: (info: { path: string }) => string[],
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

        file.slugs = slugsFn ? slugsFn({ path }) : getSlugs(path);

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

const GroupRegex = /^\(.+\)$/;

/**
 * Convert file path into slugs, also encode non-ASCII characters, so they can work in pathname
 */
export function getSlugs(file: string): string[] {
  const dir = dirname(file);
  const name = basename(file, extname(file));
  const slugs: string[] = [];

  for (const seg of dir.split('/')) {
    // filter empty names and file groups like (group_name)
    if (seg.length > 0 && !GroupRegex.test(seg)) slugs.push(encodeURI(seg));
  }

  if (GroupRegex.test(name))
    throw new Error(`Cannot use folder group in file names: ${file}`);

  if (name !== 'index') {
    slugs.push(encodeURI(name));
  }

  return slugs;
}
