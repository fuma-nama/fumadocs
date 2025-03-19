import { slash, splitPath } from '@/utils/path';

export interface FileInfo {
  /**
   * locale extension from the last second `.`, like `.en`
   *
   * empty string if no locale
   */
  locale: string;

  /**
   * File path without extension
   *
   * @deprecated obtain it with `join(dirname, name)`
   */
  flattenedPath: string;

  /**
   * Original path of file
   */
  path: string;

  /**
   * File name without locale and extension
   */
  name: string;

  /**
   * file extension from the last `.`, like `.md`
   *
   * empty string if no file extension
   */
  ext: string;

  dirname: string;
}

export interface FolderInfo {
  /**
   * Original path of folder
   */
  path: string;

  /**
   * folder name
   */
  name: string;

  dirname: string;
}

export function parseFilePath(path: string): FileInfo {
  const segments = splitPath(slash(path));

  const dirname = segments.slice(0, -1).join('/');
  let name = segments.at(-1) ?? '';
  let ext = '';
  let locale = '';

  let dotIdx = name.lastIndexOf('.');
  if (dotIdx !== -1) {
    ext = name.substring(dotIdx);
    name = name.substring(0, dotIdx);
  }

  dotIdx = name.lastIndexOf('.');
  if (dotIdx !== -1 && isLocale(name.substring(dotIdx))) {
    locale = name.substring(dotIdx);
    name = name.substring(0, dotIdx);
  }

  return {
    dirname,
    name,
    locale,
    path: segments.join('/'),
    ext,
    flattenedPath: [dirname, `${name}${locale}`]
      .filter((p) => p.length > 0)
      .join('/'),
  };
}

function isLocale(code: string): boolean {
  return code.length > 0 && !/\d+/.test(code);
}

export function parseFolderPath(path: string): FolderInfo {
  const segments = splitPath(slash(path));
  const base = segments.at(-1) ?? '';

  return {
    dirname: segments.slice(0, -1).join('/'),
    name: base,
    path: segments.join('/'),
  };
}

/**
 * @param path - Relative path
 * @returns Normalized path, with no trailing/leading slashes
 * @throws Throws error if path starts with `./` or `../`
 */
export function normalizePath(path: string): string {
  const segments = splitPath(slash(path));
  if (segments[0] === '.' || segments[0] === '..')
    throw new Error("It must not start with './' or '../'");
  return segments.join('/');
}
