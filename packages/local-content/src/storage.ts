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
  const cache = new Map<string, ParsedFile<Page, Meta>>();

  async function parseFile(file: string): Promise<ParsedFile<Page, Meta> | undefined> {
    const absolutePath = path.resolve(dir, file);
    const cached = cache.get(absolutePath);
    if (cached) return cached;

    try {
      const parsed = await integration.parse(createSourceFile(file, absolutePath));
      if (parsed) cache.set(absolutePath, parsed);
      else cache.delete(absolutePath);

      return parsed;
    } catch (e) {
      console.error(`error when parsing ${file}`, e);
      cache.delete(absolutePath);
    }
  }

  return {
    clearCache() {
      cache.clear();
    },
    invalidateCache(absolutePath: string) {
      cache.delete(absolutePath);
    },
    async getFiles() {
      const files = await glob(include, { cwd: dir });
      const out: { file: string; parsed: ParsedFile<Page, Meta> }[] = [];

      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = await Promise.all(files.slice(i, i + CHUNK_SIZE).map(parseFile));
        for (let j = 0; j < chunk.length; j++) {
          const parsed = chunk[j];
          if (parsed) out.push({ file: files[i + j], parsed });
        }
      }

      return out;
    },
  };
}
