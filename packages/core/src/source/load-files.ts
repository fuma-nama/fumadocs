import { type MetaData, type PageData } from '@/source/types';
import { parseFilePath, type FileInfo, normalizePath } from './path';
import { Storage } from './file-system';

export interface LoadOptions {
  transformers?: Transformer[];
  getSlugs: (info: FileInfo) => string[];
}

export interface I18nLoadOptions extends LoadOptions {
  i18n: {
    parser: 'dot' | 'dir';
    languages: string[];
    defaultLanguage: string;
  };
}

export interface VirtualFile {
  /**
   * Relative path
   *
   * @example `docs/page.mdx`
   */
  path: string;
  type: 'page' | 'meta';

  /**
   * Specified Slugs for page
   */
  slugs?: string[];
  data: unknown;
}

export type Transformer = (context: {
  storage: Storage;
  options: LoadOptions;
}) => void;

// Virtual files -> Virtual Storage -> Transformers -> Result
export function loadFiles<O extends LoadOptions>(
  files: VirtualFile[],
  options: O,
): Storage {
  const { transformers = [] } = options;
  const storage = new Storage();

  for (const file of files) {
    const parsedPath = normalizePath(file.path);

    if (file.type === 'page') {
      const slugs = file.slugs ?? options.getSlugs(parseFilePath(parsedPath));

      storage.write(parsedPath, file.type, {
        slugs,
        data: file.data as PageData,
      });
    }

    if (file.type === 'meta') {
      storage.write(parsedPath, file.type, file.data as MetaData);
    }
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
  options: I18nLoadOptions,
): Record<string, Storage> {
  const parser = options.i18n.parser === 'dir' ? dirParser : dotParser;
  const storages: Record<string, Storage> = {};

  for (const lang of options.i18n.languages) {
    storages[lang] = loadFiles(
      files.flatMap((file) => {
        const [path, locale] = parser(normalizePath(file.path));

        if ((locale ?? options.i18n.defaultLanguage) === lang) {
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
