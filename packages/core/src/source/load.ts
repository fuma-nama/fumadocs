import * as path from 'node:path';
import type { FileInfo, MetaData, PageData, Transformer } from './types';
import { parseFilePath } from './path';
import { Storage } from './file-system';

export interface LoadOptions {
  files: VirtualFile[];
  transformers?: Transformer[];
  rootDir: string;
  getSlugs: (info: FileInfo) => string[];
  getUrl: (slugs: string[], locale?: string) => string;
}

export interface VirtualFile {
  path: string;
  type: 'page' | 'meta';
  data: unknown;
}

export interface LoadResult {
  storage: Storage;
  getSlugs: (info: FileInfo) => string[];
  getUrl: (slugs: string[], locale?: string) => string;
  data: Record<string, unknown>;
}

// Virtual files -> Virtual Storage -> Plugins -> Result
// Result should contain page tree and basic utilities
export function load(options: LoadOptions): LoadResult {
  const { transformers = [] } = options;
  const storage = buildStorage(options);
  const ctx: LoadResult = {
    getSlugs: options.getSlugs,
    getUrl: options.getUrl,
    storage,
    data: {},
  };

  for (const transformer of transformers) {
    transformer(ctx);
  }

  return ctx;
}

function buildStorage(options: LoadOptions): Storage {
  const storage = new Storage();

  for (const file of options.files) {
    const relativePath = path.join(
      path.relative(options.rootDir, path.join('./', path.dirname(file.path))),
      path.basename(file.path),
    );

    const isRelative =
      !relativePath.startsWith('..') && !path.isAbsolute(relativePath);

    if (!isRelative) continue;

    if (file.type === 'page') {
      const parsedPath = parseFilePath(relativePath);
      const slugs = options.getSlugs(parsedPath);

      storage.write(relativePath, {
        slugs,
        url: options.getUrl(slugs, parsedPath.locale),
        type: file.type,
        data: file.data as PageData,
      });
    }

    if (file.type === 'meta') {
      storage.write(relativePath, {
        type: file.type,
        data: file.data as MetaData,
      });
    }
  }

  return storage;
}
