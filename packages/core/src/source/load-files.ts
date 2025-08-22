import { type MetaData, type PageData } from '@/source/types';
import { FileSystem } from './file-system';
import { joinPath, slash, splitPath } from '@/utils/path';
import { type VirtualFile } from '@/source/loader';
import { basename, dirname } from '@/source/path';
import type { I18nConfig } from '@/i18n';

export interface LoadOptions {
  transformers?: Transformer[];
  buildFile: (file: VirtualFile) => MetaFile | PageFile;
}

export type ContentStorage<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> = FileSystem<MetaFile<Meta> | PageFile<Page>>;

export interface MetaFile<Data extends MetaData = MetaData> {
  path: string;
  absolutePath: string;

  format: 'meta';
  data: Data;
}

export interface PageFile<Data extends PageData = PageData> {
  path: string;
  absolutePath: string;

  format: 'page';
  slugs: string[];
  data: Data;
}

export type Transformer = (context: {
  storage: ContentStorage;
  options: LoadOptions;
}) => void;

function isLocaleValid(locale: string) {
  return locale.length > 0 && !/\d+/.test(locale);
}

const parsers = {
  dir(path: string): [string, string?] {
    const [locale, ...segs] = path.split('/');

    if (locale && segs.length > 0 && isLocaleValid(locale))
      return [segs.join('/'), locale];

    return [path];
  },
  dot(path: string): [string, string?] {
    const dir = dirname(path);
    const base = basename(path);
    const parts = base.split('.');
    if (parts.length < 3) return [path];

    const [locale] = parts.splice(parts.length - 2, 1);
    if (!isLocaleValid(locale)) return [path];

    return [joinPath(dir, parts.join('.')), locale];
  },
  none(path: string): [string, string?] {
    return [path];
  },
};

// Virtual files -> Virtual Storage -> Transformers -> Result
/**
 * @returns a map of locale and its content storage.
 *
 * in the storage, locale codes are removed from file paths, hence the same file will have same file paths in every storage.
 */
export function loadFiles(
  files: VirtualFile[],
  options: LoadOptions,
  i18n: I18nConfig,
): Record<string, ContentStorage> {
  const { buildFile, transformers = [] } = options;
  const parser = parsers[i18n.parser ?? 'dot'];
  const storages: Record<string, ContentStorage> = {};
  const normalized = files.map((file) =>
    buildFile({
      ...file,
      path: normalizePath(file.path),
    }),
  );
  const fallbackLang =
    i18n.fallbackLanguage !== null
      ? (i18n.fallbackLanguage ?? i18n.defaultLanguage)
      : null;

  function scan(lang: string) {
    if (storages[lang]) return;

    let storage: ContentStorage;
    if (fallbackLang && fallbackLang !== lang) {
      scan(fallbackLang);
      storage = new FileSystem(storages[fallbackLang]);
    } else {
      storage = new FileSystem();
    }

    for (const item of normalized) {
      const [path, locale = i18n.defaultLanguage] = parser(item.path);

      if (locale === lang) storage.write(path, item);
    }

    for (const transformer of transformers) {
      transformer({
        storage,
        options,
      });
    }

    storages[lang] = storage;
  }

  for (const lang of i18n.languages) scan(lang);
  return storages;
}

/**
 * @param path - Relative path
 * @returns Normalized path, with no trailing/leading slashes
 * @throws Throws error if path starts with `./` or `../`
 */
function normalizePath(path: string): string {
  const segments = splitPath(slash(path));
  if (segments[0] === '.' || segments[0] === '..')
    throw new Error("It must not start with './' or '../'");
  return segments.join('/');
}
