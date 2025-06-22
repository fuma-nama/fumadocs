import { type MetaData, type PageData } from '@/source/types';
import { FileSystem } from './file-system';
import { slash, splitPath } from '@/utils/path';
import { VirtualFile } from '@/source/loader';

export interface LoadOptions {
  transformers?: Transformer[];
  buildFiles: (files: VirtualFile[]) => (MetaFile | PageFile)[];
}

export type ContentStorage = FileSystem<MetaFile | PageFile>;

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

// Virtual files -> Virtual Storage -> Transformers -> Result
export function loadFiles(
  files: VirtualFile[],
  options: LoadOptions,
): ContentStorage {
  const { transformers = [] } = options;
  const storage: ContentStorage = new FileSystem();
  const normalized: VirtualFile[] = files.map((file) => ({
    ...file,
    path: normalizePath(file.path),
  }));

  for (const item of options.buildFiles(normalized)) {
    storage.write(item.path, item);
  }

  for (const transformer of transformers) {
    transformer({
      storage,
      options,
    });
  }

  return storage;
}

export function loadFilesI18n(
  files: VirtualFile[],
  options: LoadOptions,
  i18n: {
    parser: 'dot' | 'dir';
    languages: string[];
    defaultLanguage: string;
  },
): Record<string, ContentStorage> {
  const parser = i18n.parser === 'dir' ? dirParser : dotParser;
  const storages: Record<string, ContentStorage> = {};

  for (const lang of i18n.languages) {
    storages[lang] = loadFiles(
      files.flatMap((file) => {
        const [path, locale] = parser(normalizePath(file.path));

        if ((locale ?? i18n.defaultLanguage) === lang) {
          return {
            ...file,
            path,
          };
        }

        return [];
      }),
      options,
    );
  }

  return storages;
}

function dirParser(path: string): [string, string?] {
  const parsed = path.split('/');
  if (parsed.length >= 2) return [parsed.slice(1).join('/'), parsed[0]];

  return [path];
}

function dotParser(path: string): [string, string?] {
  const segs = path.split('/');
  if (segs.length === 0) return [path];

  const name = segs[segs.length - 1].split('.');
  if (name.length >= 3) {
    const locale = name.splice(name.length - 2, 1)[0];

    if (locale.length > 0 && !/\d+/.test(locale)) {
      segs[segs.length - 1] = name.join('.');

      return [segs.join('/'), locale];
    }
  }

  return [path];
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
