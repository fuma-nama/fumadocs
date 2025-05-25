import { slash, splitPath } from '@/utils/path';

export interface FileInfo {
  /**
   * File path without extension
   *
   * @deprecated obtain it with `join(dirname, name)`
   */
  flattenedPath: string;

  /**
   * path of file (unparsed)
   */
  path: string;

  /**
   * File name without extension
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

  const dotIdx = name.lastIndexOf('.');
  if (dotIdx !== -1) {
    ext = name.substring(dotIdx);
    name = name.substring(0, dotIdx);
  }

  return {
    dirname,
    name,
    path: segments.join('/'),
    ext,
    get flattenedPath() {
      return [dirname, name].filter((p) => p.length > 0).join('/');
    },
  };
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
