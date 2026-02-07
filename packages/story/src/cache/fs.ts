import fs from 'node:fs/promises';
import * as path from 'node:path';
import { Cache } from '.';

export function createFileSystemCache(dir: string): Cache {
  // call `path.resolve` so Vercel NFT will include the cache directory in production.
  dir = path.resolve(dir);
  const initDirPromise = fs.mkdir(dir, { recursive: true }).catch(() => {
    // it fails on Vercel as of 2025 12 May, we can skip it
  });

  return {
    async write(key, data) {
      await initDirPromise;
      await fs.writeFile(path.join(dir, `${key}.json`), data);
    },
    async read(key) {
      try {
        return (await fs.readFile(path.join(dir, `${key}.json`))).toString();
      } catch {
        return;
      }
    },
  };
}
