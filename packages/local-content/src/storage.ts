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
      const chunks: Promise<(ParsedFile<Page, Meta> | undefined)[]>[] = [];

      for (let i = 0; i < files.length; i += CHUNK_SIZE) {
        const chunk = files.slice(i, i + CHUNK_SIZE).map(parseFile);
        chunks.push(Promise.all(chunk));
      }

      const out: { file: string; parsed: ParsedFile<Page, Meta> }[] = [];
      let index = 0;
      for await (const chunk of chunks) {
        for (const parsed of chunk) {
          const file = files[index++];
          if (parsed) out.push({ file, parsed });
        }
      }

      return out;
    },
  };
}
