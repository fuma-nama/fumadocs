import { parse } from 'node:path';
import slash from '@/utils/slash';
import type { FileInfo } from './types';

export function parseFilePath(path: string): FileInfo {
  const parsed = parse(path);
  const dir = slash(parsed.dir);
  const flattenedPath = joinPaths([dir, parsed.name]);
  const [name, locale] = parsed.name.split('.');

  return {
    dirname: dir,
    name,
    flattenedPath,
    locale,
    path,
  };
}

export function isRelative(path: string, root: string): boolean {
  return path.startsWith(root);
}

export function getRelativePath(path: string, root: string): string {
  if (!isRelative(path, root)) throw new Error('Invalid path');
  return splitPath(path.substring(root.length)).join('/');
}

export function parseFolderPath(path: string): FileInfo {
  const parsed = parse(path);
  const dir = slash(parsed.dir);
  const [name, locale] = parsed.base.split('.');

  return {
    dirname: dir,
    name,
    flattenedPath: path,
    locale,
    path,
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
