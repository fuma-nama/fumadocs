import { basename, dirname, parse } from 'node:path';
import type { FileInfo } from './types';

export function parseFilePath(path: string, root = ''): FileInfo {
  const relativePath = getRelativePath(path, root);
  const parsed = parse(relativePath);
  const dir = parsed.dir.replace('\\', '/');
  const flattenedPath = joinPaths([dir, parsed.name]);
  const locale = parsed.name.split('.')[1];

  return {
    dirname: dir,
    name: parsed.name,
    flattenedPath,
    locale,
    path: relativePath,
  };
}

export function isRelative(path: string, root: string): boolean {
  return path.startsWith(root);
}

function getRelativePath(path: string, root: string): string {
  if (!isRelative(path, root)) throw new Error('Invalid path');
  return splitPath(path.substring(root.length)).join('/');
}

export function parseFolderPath(p: string): FileInfo {
  const name = basename(p);
  const dir = dirname(p).replace('\\', '/');

  return {
    dirname: dir,
    name,
    flattenedPath: p,
    locale: name.split('.')[1],
    path: p,
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
 * @param slash - whether to add a trailing/leading slash to path
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
  slash: 'leading' | 'trailing' | 'none' = 'none',
): string {
  const joined = paths
    // avoid slashes in path and filter empty
    .flatMap((path) => splitPath(path))
    .join('/');

  switch (slash) {
    case 'leading':
      return `/${joined}`;
    case 'trailing':
      return `${joined}/`;
    default:
      return joined;
  }
}
