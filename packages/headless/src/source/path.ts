import path from 'node:path';
import { joinPaths, splitPath } from '@/server/utils';
import type { FileInfo } from './types';

export function parsePath(p: string, root = ''): FileInfo {
  if (!p.startsWith(root)) throw new Error('Invalid path');
  const relativePath = splitPath(p.substring(root.length)).join('/');

  const parsed = path.parse(relativePath);
  const normalizedDirname = parsed.dir.replace('\\', '/');
  const flattenedPath = joinPaths([normalizedDirname, parsed.name]);
  const locale = parsed.name.split('.')[1];

  return {
    dirname: normalizedDirname,
    name: parsed.name,
    flattenedPath,
    locale,
    path: relativePath,
  };
}
