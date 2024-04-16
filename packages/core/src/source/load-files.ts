import { parseFilePath, type FileInfo, normalizePath } from './path';
import { Storage } from './file-system';

export interface LoadOptions {
  files: VirtualFile[];
  transformers?: Transformer[];
  rootDir: string;
  getSlugs: (info: FileInfo) => string[];
  getUrl: (slugs: string[], locale?: string) => string;
}

export interface VirtualFile {
  /**
   * Relative path
   *
   * @example `docs/page.mdx`
   */
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
  const rootDir = normalizePath(options.rootDir);

  for (const file of options.files) {
    const normalizedPath = normalizePath(file.path);
    if (!normalizedPath.startsWith(rootDir)) continue;

    const relativePath = normalizePath(normalizedPath.slice(rootDir.length));

    if (file.type === 'page') {
      const parsedPath = parseFilePath(relativePath);
      const slugs = options.getSlugs(parsedPath);

      storage.write(relativePath, file.type, {
        slugs,
        url: options.getUrl(slugs, parsedPath.locale),
        data: file.data,
      });
    }

    if (file.type === 'meta') {
      storage.write(relativePath, file.type, {
        data: file.data,
      });
    }
  }

  return storage;
}
