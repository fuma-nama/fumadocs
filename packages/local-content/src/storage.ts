import path from 'node:path';
import { glob } from 'tinyglobby';
import { createSourceFile, type ContentIntegration, type ParsedFile } from './integration';

const CHUNK_SIZE = 100;

export interface StorageConfig<Page, Meta> {
  /** root directory for content files */
  dir: string;
  /** overrides the integration's patterns */
  include?: string[];
  integration: ContentIntegration<Page, Meta>;
}

export function createStorage<Page, Meta>(config: StorageConfig<Page, Meta>) {
  const { dir, integration, include = integration.include } = config;
  let cache = new Map<string, ParsedFile<Page, Meta>>();

  return {
    clearCache() {
      cache.clear();
    },
    invalidateCache(absolutePath: string) {
      cache.delete(absolutePath);
    },
    async getFiles() {
      const nextCache = new Map<string, ParsedFile<Page, Meta>>();
      const files = await glob(include, { cwd: dir });
      const out: { file: string; parsed: ParsedFile<Page, Meta> }[] = [];
      let idx = 0;

      async function parseFile(file: string): Promise<ParsedFile<Page, Meta> | undefined> {
        const absolutePath = path.resolve(dir, file);
        const cached = cache.get(absolutePath);
        if (cached) {
          nextCache.set(absolutePath, cached);
          return cached;
        }

        try {
          const parsed = await integration.parse(createSourceFile(file, absolutePath));
          if (parsed) nextCache.set(absolutePath, parsed);
          return parsed;
        } catch (e) {
          console.error(`error when parsing ${file}`, e);
        }
      }

      async function next() {
        if (idx >= files.length) return;
        try {
          const file = files[idx++];
          const parsed = await parseFile(file);
          if (parsed) out.push({ file, parsed });
        } finally {
          await next();
        }
      }

      const promises: Promise<void>[] = [];
      for (let i = 0; i < Math.min(CHUNK_SIZE, files.length); i++) {
        promises.push(next());
      }
      await Promise.all(promises);
      cache = nextCache;
      return out;
    },
  };
}
