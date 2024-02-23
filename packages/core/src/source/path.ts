import { parse } from 'node:path';
import slash from '@/utils/slash';
import type { FileInfo } from './types';

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
