import { parse } from 'node:path';
import slash from '@/utils/slash';

export interface FileInfo {
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
  const normalized = normalizePath(path);
  const parsed = parse(normalized);
  const flattenedPath = [parsed.dir, parsed.name]
    .filter((p) => p.length > 0)
    .join('/');
  const [name, locale] = parsed.name.split('.');

  return {
    dirname: parsed.dir,
    name,
    flattenedPath,
    locale,
    path: normalized,
  };
}

export function parseFolderPath(path: string): FileInfo {
  const normalized = normalizePath(path);
  const parsed = parse(normalized);
  const [name, locale] = parsed.base.split('.');

  return {
    dirname: parsed.dir,
    name,
    flattenedPath: normalized,
    locale,
    path: normalized,
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
 * @param slashMode - whether to add a trailing/leading slash to path
 * @example
 * ```
 * ['a','b'] // 'a/b'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', '../b/c'] // 'b/c'
 * ```
 */
export function resolvePath(
  from: string,
  join: string,
  slashMode: 'leading' | 'trailing' | 'none' = 'none',
): string {
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

  const joined = v1.join('/');

  switch (slashMode) {
    case 'leading':
      return `/${joined}`;
    case 'trailing':
      return `${joined}/`;
    default:
      return joined;
  }
}
