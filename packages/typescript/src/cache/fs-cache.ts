import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Cache } from '@/cache/index';

export function createFileSystemGeneratorCache(dir: string): Cache {
  // call `path.resolve` so Vercel NFT will include the cache directory in production.
  dir = path.resolve(dir);
  const initDirPromise = fs.mkdir(dir, { recursive: true }).catch(() => {
    // it fails on Vercel as of 2025 12 May, we can skip it
  });

  return {
    async write(input, data) {
      const hash = createHash('SHA256').update(input).digest('hex').slice(0, 12);

      await initDirPromise;
      await fs.writeFile(path.join(dir, `${hash}.json`), JSON.stringify(data));
    },
    async read(input) {
      const hash = createHash('SHA256').update(input).digest('hex').slice(0, 12);

      try {
        return JSON.parse((await fs.readFile(path.join(dir, `${hash}.json`))).toString());
      } catch {
        return;
      }
    },
  };
}
