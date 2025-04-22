/**
 * Original: https://github.com/shikijs/shiki/blob/main/packages/vitepress-twoslash/src/cache-fs.ts
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { TwoslashReturn } from 'twoslash';

export interface FileSystemTypeResultCacheOptions {
  /**
   * The directory to store the cache files.
   *
   * @default '.next/cache/twoslash'
   */
  dir?: string;
}

export interface TwoslashTypesCache {
  /**
   * Read cached result
   *
   * @param code Source code
   */
  read: (code: string) => TwoslashReturn | null;

  /**
   * Save result to cache
   *
   * @param code Source code
   * @param data Twoslash data
   */
  write: (code: string, data: TwoslashReturn) => void;

  /**
   * On initialization
   */
  init?: () => void;
}

export function createFileSystemTypesCache(
  options: FileSystemTypeResultCacheOptions = {},
): TwoslashTypesCache {
  const dir = resolve(options.dir ?? '.next/cache/twoslash');

  return {
    init() {
      mkdirSync(dir, { recursive: true });
    },
    read(code) {
      const hash = createHash('SHA256').update(code).digest('hex').slice(0, 12);
      const filePath = join(dir, `${hash}.json`);
      if (!existsSync(filePath)) {
        return null;
      }
      return JSON.parse(readFileSync(filePath, { encoding: 'utf-8' }));
    },
    write(code, data) {
      const hash = createHash('SHA256').update(code).digest('hex').slice(0, 12);
      const filePath = join(dir, `${hash}.json`);
      const json = JSON.stringify(data);
      writeFileSync(filePath, json, { encoding: 'utf-8' });
    },
  };
}
