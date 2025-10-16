import { LRUCache } from 'lru-cache';
import fs from 'node:fs/promises';
import path from 'node:path';

const map = new LRUCache<string, Promise<string>>({
  max: 100,
});

/**
 * make file paths relative to cwd
 */
function toFullPath(file: string) {
  if (path.isAbsolute(file)) {
    return path.relative(process.cwd(), file);
  }

  return file;
}

export async function readFileWithCache(file: string): Promise<string> {
  const fullPath = toFullPath(file);
  const cached = map.get(fullPath);
  if (cached) return cached;

  const read = fs.readFile(fullPath).then((s) => s.toString());
  map.set(fullPath, read);
  return read;
}

export function removeFileCache(file: string) {
  map.delete(toFullPath(file));
}
