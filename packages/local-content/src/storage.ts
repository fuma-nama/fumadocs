import fs from 'node:fs/promises';
import path from 'node:path';
import picomatch from 'picomatch';
import { glob } from 'tinyglobby';
import type { ContentIntegration, ParsedFile } from './integration';

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
  const isContentFile = picomatch(include);
  let cache = new Map<string, ParsedFile<Page, Meta>>();
  /** file -> the parsed files depending on it */
  const dependents = new Map<string, Set<string>>();
  const listeners = new Set<(file: string) => void>();

  function addDependency(dependent: string, file: string) {
    let files = dependents.get(file);
    if (!files) {
      dependents.set(file, (files = new Set()));
      for (const listener of listeners) listener(file);
    }
    files.add(dependent);
  }

  return {
    clearCache() {
      cache.clear();
    },
    invalidate(absolutePath: string): boolean {
      cache.delete(absolutePath);
      const files = dependents.get(absolutePath);
      if (files) {
        for (const file of files) cache.delete(file);
        return true;
      }

      const relative = path.relative(dir, absolutePath);
      return !relative.startsWith('..') && !path.isAbsolute(relative) && isContentFile(relative);
    },
    onDependency(listener: (file: string) => void): () => void {
      for (const file of dependents.keys()) listener(file);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
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
          const parsed = await integration.parse({
            path: file,
            absolutePath,
            read: () => fs.readFile(absolutePath, 'utf-8'),
            addDependency: (dependency) => addDependency(absolutePath, path.resolve(dependency)),
          });
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
