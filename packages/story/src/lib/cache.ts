import fs from 'node:fs/promises';
import * as path from 'node:path';

export interface Cache {
  read: (key: string) => unknown | undefined | Promise<unknown | undefined>;
  write: (key: string, value: unknown) => void | Promise<void>;
}

export function createFileSystemCache(dir: string): Cache {
  // call `path.resolve` so Vercel NFT will include the cache directory in production.
  dir = path.resolve(dir);
  const initDirPromise = fs.mkdir(dir, { recursive: true }).catch(() => {
    // it fails on Vercel as of 2025 12 May, we can skip it
  });

  return {
    async write(key, data) {
      await initDirPromise;
      await fs.writeFile(path.join(dir, `${key}.json`), JSON.stringify(data));
    },
    async read(key) {
      try {
        return JSON.parse((await fs.readFile(path.join(dir, `${key}.json`))).toString());
      } catch {
        return;
      }
    },
  };
}
