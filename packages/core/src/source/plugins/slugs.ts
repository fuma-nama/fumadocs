import { basename, dirname, extname } from '@/source/path';
import type { ContentStoragePageFile } from '../storage/content';
import type { LoaderConfig, LoaderPlugin } from '../loader';

/**
 * a function to generate slugs, return `undefined` to fallback to default generation.
 */
export type SlugFn<Config extends LoaderConfig = LoaderConfig> = (
  file: ContentStoragePageFile<Config['source']>,
) => string[] | undefined;

/**
 * Generate slugs for pages if missing
 */
export function slugsPlugin<Config extends LoaderConfig = LoaderConfig>(
  slugFn?: SlugFn<Config>,
): LoaderPlugin<Config> {
  function isIndex(file: string) {
    return basename(file, extname(file)) === 'index';
  }

  return {
    name: 'fumadocs:slugs',
    transformStorage({ storage }) {
      const indexFiles: string[] = [];
      const taken = new Set<string>();

      for (const path of storage.getFiles()) {
        const file = storage.read(path);
        if (!file || file.format !== 'page' || file.slugs) continue;

        const customSlugs = slugFn?.(file);
        // for custom slugs function, don't handle conflicting cases like `dir/index.mdx` vs `dir.mdx`
        if (customSlugs === undefined && isIndex(path)) {
          indexFiles.push(path);
          continue;
        }

        file.slugs = customSlugs ?? getSlugs(path);
        const key = file.slugs.join('/');
        if (taken.has(key)) throw new Error(`Duplicated slugs: ${key}`);
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

/**
 * Generate slugs from file data (e.g. frontmatter).
 *
 * @param key - the property name in file data to generate slugs, default to `slug`.
 */
export function slugsFromData<Config extends LoaderConfig = LoaderConfig>(
  key = 'slug',
): SlugFn<Config> {
  return (file) => {
    const k = key as keyof typeof file.data;

    if (k in file.data && typeof file.data[k] === 'string') {
      return file.data[k].split('/').filter((v) => v.length > 0);
    }
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

  if (GroupRegex.test(name)) throw new Error(`Cannot use folder group in file names: ${file}`);

  if (name !== 'index') {
    slugs.push(encodeURI(name));
  }

  return slugs;
}
