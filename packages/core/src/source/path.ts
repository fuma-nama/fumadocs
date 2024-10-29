import { slash, splitPath } from '@/utils/path';

export interface FileInfo {
  /**
   * The locale extension of file
   */
  locale?: string;

  /**
   * Original path of file
   */
  path: string;

  /**
   * File path without extension
   */
  flattenedPath: string;

  /**
   * File name without locale and extension
   */
  name: string;

  dirname: string;
}

export function parseFilePath(path: string): FileInfo {
  const segments = splitPath(slash(path));

  const dirname = segments.slice(0, -1).join('/');
  const base = segments.at(-1) ?? '';

  const dotIdx = base.lastIndexOf('.');
  const nameWithLocale = dotIdx !== -1 ? base.slice(0, dotIdx) : base;

  const flattenedPath = [dirname, nameWithLocale]
    .filter((p) => p.length > 0)
    .join('/');

  const [name, locale] = getLocale(nameWithLocale);
  return {
    dirname,
    name,
    flattenedPath,
    locale,
    path: segments.join('/'),
  };
}

export function parseFolderPath(path: string): FileInfo {
  const segments = splitPath(slash(path));
  const base = segments.at(-1) ?? '';
  const [name, locale] = getLocale(base);
  const flattenedPath = segments.join('/');

  return {
    dirname: segments.slice(0, -1).join('/'),
    name,
    flattenedPath,
    locale,
    path: flattenedPath,
  };
}

function getLocale(name: string): [string, string?] {
  const sep = name.lastIndexOf('.');
  if (sep === -1) return [name];
  const locale = name.slice(sep + 1);

  if (/\d+/.exec(locale)) return [name];
  return [name.slice(0, sep), locale];
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
