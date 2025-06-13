/**
 * Original: https://github.com/shikijs/shiki/blob/main/packages/vitepress-twoslash/src/cache-fs.ts
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { TwoslashTypesCache } from '@/index';
import * as process from 'node:process';

export interface FileSystemTypeResultCacheOptions {
  /**
   * The directory to store the cache files.
   *
   * @default '.next/cache/twoslash'
   */
  dir?: string;

  cwd?: string;
}

export function createFileSystemTypesCache(
  options: FileSystemTypeResultCacheOptions = {},
): TwoslashTypesCache {
  const { cwd = process.cwd() } = options;
  const dir = path.join(cwd, options.dir ?? '.next/cache/twoslash');

  return {
    init() {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // skip
      }
    },
    read(code) {
      const hash = createHash('SHA256').update(code).digest('hex').slice(0, 12);
      const filePath = path.join(dir, `${hash}.json`);
      if (!fs.existsSync(filePath)) {
        return null;
      }
      return JSON.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));
    },
    write(code, data) {
      const hash = createHash('SHA256').update(code).digest('hex').slice(0, 12);
      const filePath = path.join(dir, `${hash}.json`);
      const json = JSON.stringify(data);
      fs.writeFileSync(filePath, json, { encoding: 'utf-8' });
    },
  };
}
