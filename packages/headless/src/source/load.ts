import type { FileInfo, MetaData, PageData, Transformer } from './types';
import { getRelativePath, isRelative, parseFilePath } from './path';
import * as FileGraph from './file-graph';

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
  storage: FileGraph.Storage;
  getSlugs: (info: FileInfo) => string[];
  getUrl: (slugs: string[], locale?: string) => string;
  data: Record<string, unknown>;
}

// Virtual files -> File Graph -> Plugins -> Result
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

function buildStorage(options: LoadOptions): FileGraph.Storage {
  const storage = FileGraph.makeGraph();

  for (const file of options.files) {
    if (!isRelative(file.path, options.rootDir)) continue;
    const path = getRelativePath(file.path, options.rootDir);

    if (file.type === 'page') {
      const parsedPath = parseFilePath(path);
      const slugs = options.getSlugs(parsedPath);

      storage.write(path, {
        slugs,
        url: options.getUrl(slugs, parsedPath.locale),
        type: file.type,
        data: file.data as PageData,
      });
    }

    if (file.type === 'meta') {
      storage.write(path, {
        type: file.type,
        data: file.data as MetaData,
      });
    }
  }

  return storage;
}
