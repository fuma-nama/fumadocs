import { basename, dirname, extname } from '@/source/path';
import type { ContentStorage } from '../storage/content';
import type { LoaderPlugin } from '../loader';

/**
 * a function to generate slugs, return `undefined` to generate default slugs.
 *
 * conflicting cases like `dir/index.mdx` vs `dir.mdx` are resolved after the function returns.
 *
 * @param next - generate the default slugs from file path (before conflict resolution).
 */
export type SlugFn<S extends ContentStorage = ContentStorage> = (
  file: S['$inferPage'],
  next: () => string[],
) => string[] | undefined;

export interface SlugsPluginOptions<S extends ContentStorage = ContentStorage> {
  /** Slugs to prepend to every page. */
  baseSlugs?: string[];

  /** generate default slugs for pages */
  slugs?: SlugFn<S>;
}

/**
 * Generate slugs for pages if missing.
 */
export function slugsPlugin(optsOrFn: SlugsPluginOptions | SlugFn = {}): LoaderPlugin {
  const prepended = new WeakSet<ContentStorage['$inferPage']>();
  const { baseSlugs = [], slugs: slugFn }: SlugsPluginOptions =
    typeof optsOrFn === 'function'
      ? {
          slugs: optsOrFn,
        }
      : optsOrFn;

  function generateSlugs(path: string, file: ContentStorage['$inferPage']) {
    const out = slugFn?.(file, () => getSlugs(path)) ?? getSlugs(path);
    prepended.add(file);
    return baseSlugs.length > 0 ? [...baseSlugs, ...out] : out;
  }

  return {
    name: 'fumadocs:slugs',
    transformStorage({ storage }) {
      const indexFiles: string[] = [];
      const taken = new Set<string>();

      for (const path of storage.getFiles()) {
        const file = storage.read(path);
        if (!file || file.format !== 'page') continue;

        if (file.slugs) {
          if (baseSlugs.length > 0 && !prepended.has(file)) {
            file.slugs = [...baseSlugs, ...file.slugs];
            prepended.add(file);
          }
          continue;
        }

        // defer index files, so conflicting cases like `dir/index.mdx` vs `dir.mdx` can be resolved
        if (basename(path, extname(path)) === 'index') {
          indexFiles.push(path);
          continue;
        }

        file.slugs = generateSlugs(path, file);
        const key = file.slugs.join('/');
        if (taken.has(key)) throw new Error(`Duplicated slugs: ${key}`);
        taken.add(key);
      }

      for (const path of indexFiles) {
        const file = storage.read(path);
        if (file?.format !== 'page') continue;

        file.slugs = generateSlugs(path, file);
        if (taken.has(file.slugs.join('/'))) file.slugs = [...file.slugs, 'index'];

        const key = file.slugs.join('/');
        if (taken.has(key)) throw new Error(`Duplicated slugs: ${key}`);
        taken.add(key);
      }
    },
  };
}

/**
 * Generate slugs from file data (e.g. frontmatter).
 *
 * @param key - the property name in file data to generate slugs, default to `slug`.
 */
export function slugsFromData(key = 'slug'): SlugFn {
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
