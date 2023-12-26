import type { FileInfo, MetaData, PageData, Transformer } from './types';
import { isRelative, parseFilePath } from './path';
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

export interface RawPage<Data extends PageData = PageData> {
  info: FileInfo;
  type: 'page';
  slugs: string[];
  url: string;
  data: Data;
}

export interface RawMeta<Data extends MetaData = MetaData> {
  info: FileInfo;
  type: 'meta';
  data: Data;
}

export type RawFile<
  PG extends PageData = PageData,
  MG extends MetaData = MetaData,
> = RawPage<PG> | RawMeta<MG>;

export interface LoadResult {
  storage: FileGraph.Storage;
  files: RawFile[];
  data: Record<string, unknown>;
}

// Virtual files -> File Graph -> Plugins -> Result
// Result should contain page tree and basic utilities
export function load({
  files,
  transformers = [],
  rootDir,
  getSlugs,
  getUrl,
}: LoadOptions): LoadResult {
  const parsed = files
    .filter((file) => isRelative(file.path, rootDir))
    .map<RawFile>((file) => {
      const info = parseFilePath(file.path, rootDir);

      if (file.type === 'page') {
        const slugs = getSlugs(info);

        return {
          type: file.type,
          info,
          url: getUrl(slugs, info.locale),
          slugs,
          data: file.data as PageData,
        };
      }

      return {
        type: file.type,
        info,
        data: file.data as MetaData,
      };
    });
  const storage = buildStorage(parsed);
  const ctx: LoadResult = { files: parsed, storage, data: {} };

  for (const transformer of transformers) {
    transformer(ctx);
  }

  return ctx;
}

function buildStorage(files: RawFile[]): FileGraph.Storage {
  const storage = FileGraph.makeGraph();

  for (const file of files) {
    if (file.type === 'page') {
      storage.add({
        slugs: file.slugs,
        url: file.url,
        type: file.type,
        file: file.info,
        data: file.data,
      });
    }

    if (file.type === 'meta') {
      storage.add({
        type: file.type,
        file: file.info,
        data: file.data,
      });
    }
  }

  return storage;
}
