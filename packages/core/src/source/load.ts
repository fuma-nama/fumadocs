import * as path from 'node:path';
import type { MetaData, PageData } from './types';
import { parseFilePath, type FileInfo } from './path';
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
}

export type Transformer = (context: {
  storage: Storage;
  getSlugs: (info: FileInfo) => string[];
  getUrl: (slugs: string[], locale?: string) => string;
}) => void;

// Virtual files -> Virtual Storage -> Plugins -> Result
// Result should contain page tree and basic utilities
export function load(options: LoadOptions): LoadResult {
  const { transformers = [] } = options;
  const storage = buildStorage(options);

  for (const transformer of transformers) {
    transformer({
      storage,
      getUrl: options.getUrl,
      getSlugs: options.getSlugs,
    });
  }

  return { storage };
}

function buildStorage(options: LoadOptions): Storage {
  const storage = new Storage();

  for (const file of options.files) {
    const relativePath = path.join(
      path.relative(options.rootDir, path.join('./', path.dirname(file.path))),
      path.basename(file.path),
    );

    if (relativePath.startsWith('..') || path.isAbsolute(relativePath))
      continue;

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
