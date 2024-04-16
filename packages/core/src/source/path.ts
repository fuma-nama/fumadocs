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
  const slashedPath = slash(path);
  const parsed = parse(slashedPath);
  const flattenedPath = joinPaths([parsed.dir, parsed.name]);
  const [name, locale] = parsed.name.split('.');

  return {
    dirname: parsed.dir,
    name,
    flattenedPath,
    locale,
    path: slashedPath,
  };
}

export function parseFolderPath(path: string): FileInfo {
  const slashedPath = slash(path);
  const parsed = parse(slashedPath);
  const [name, locale] = parsed.base.split('.');

  return {
    dirname: parsed.dir,
    name,
    flattenedPath: slashedPath,
    locale,
    path: slashedPath,
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
  return joinPaths(segments);
}

/**
 * Split path into segments, trailing/leading slashes are removed
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => p.length > 0);
}

/**
 * Convert paths to an array, slashes within the path will be ignored
 * @param paths - Paths to join
 * @param slashMode - whether to add a trailing/leading slash to path
 * @example
 * ```
 * ['a','b','c'] // 'a/b/c'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', 'b/c'] // 'a/b/c'
 * ```
 */
export function joinPaths(
  paths: string[],
  slashMode: 'leading' | 'trailing' | 'none' = 'none',
): string {
  const joined = paths
    // avoid slashes in path and filter empty
    .flatMap((path) => splitPath(path))
    .join('/');

  switch (slashMode) {
    case 'leading':
      return `/${joined}`;
    case 'trailing':
      return `${joined}/`;
    default:
      return joined;
  }
}
