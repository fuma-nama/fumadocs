import slash from '@/utils/slash';

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

/**
 * Split path into segments, trailing/leading slashes are removed
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => p.length > 0);
}

/**
 * Resolve paths, slashes within the path will be ignored
 * @param from - Path to resolve from
 * @param join - Paths to resolve
 * @example
 * ```
 * ['a','b'] // 'a/b'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', '../b/c'] // 'b/c'
 * ```
 */
export function resolvePath(from: string, join: string): string {
  const v1 = splitPath(from),
    v2 = splitPath(join);

  while (v2.length > 0) {
    switch (v2[0]) {
      case '..':
        v1.pop();
        break;
      case '.':
        break;
      default:
        v1.push(v2[0]);
    }

    v2.shift();
  }

  return v1.join('/');
}
