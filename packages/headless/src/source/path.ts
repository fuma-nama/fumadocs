import path from 'node:path';
import { joinPaths, splitPath } from '@/server/utils';
import type { FileInfo } from './types';

export function parseFilePath(p: string, root = ''): FileInfo {
  const relativePath = getRelativePath(p, root);
  const parsed = path.parse(relativePath);
  const dirname = parsed.dir.replace('\\', '/');
  const flattenedPath = joinPaths([dirname, parsed.name]);
  const locale = parsed.name.split('.')[1];

  return {
    dirname,
    name: parsed.name,
    flattenedPath,
    locale,
    path: relativePath,
  };
}

export function isRelative(p: string, root: string): boolean {
  return p.startsWith(root);
}

function getRelativePath(p: string, root: string): string {
  if (!isRelative(p, root)) throw new Error('Invalid path');
  return splitPath(p.substring(root.length)).join('/');
}

export function parseFolderPath(p: string): FileInfo {
  const name = path.basename(p);
  const dirname = path.dirname(p).replace('\\', '/');

  return {
    dirname,
    name,
    flattenedPath: p,
    locale: name.split('.')[1],
    path: p,
  };
}
