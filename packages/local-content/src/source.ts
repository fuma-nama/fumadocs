import type {
  DynamicSource,
  MetaData,
  PageData,
  StaticSource,
  VirtualFile,
} from 'fumadocs-core/source';
import path from 'node:path';
import { createStorage } from './storage';
import type { ContentIntegration, ParsedFile } from './integration';

/** what a dev-time watcher needs, implemented by the adapters under `./dev` */
export interface WatchableSource {
  /** absolute path of the content directory */
  readonly dir: string;
  /** glob patterns to scan, relative to {@link dir} */
  readonly include: string[];
  /** drop caches for a file so the next read picks up its content */
  invalidateFile: (file: string) => void;
}

export interface SourceOptions {
  /** base directory for virtual file paths */
  baseDir?: string;
}

export interface LocalSourceConfig<Page extends PageData, Meta extends MetaData> {
  /** root directory for content files */
  dir: string;
  /** overrides the integration's patterns */
  include?: string[];
  integration: ContentIntegration<Page, Meta>;
}

export interface LocalSource<Page extends PageData, Meta extends MetaData> extends WatchableSource {
  staticSource: (
    options?: SourceOptions,
  ) => Promise<StaticSource<{ pageData: Page; metaData: Meta }>>;
  dynamicSource: (options?: SourceOptions) => DynamicSource<{ pageData: Page; metaData: Meta }>;
  /** drop every parsed file and source cache */
  invalidateAll: () => void;
  /**
   * @deprecated import `watchWithDevServer` from `@fumadocs/local-content/dev/ws`,
   * or `watchWithVite` from `@fumadocs/local-content/dev/vite`, instead.
   */
  devServer: (url?: string) => Promise<void>;
}

export function createLocalSource<Page extends PageData, Meta extends MetaData>(
  config: LocalSourceConfig<Page, Meta>,
): LocalSource<Page, Meta> {
  type LocalVirtualFile = VirtualFile<{ pageData: Page; metaData: Meta }>;
  const fileCache = new WeakMap<ParsedFile<Page, Meta>, LocalVirtualFile>();
  const storage = createStorage(config);

  async function createFiles({ baseDir }: SourceOptions = {}): Promise<LocalVirtualFile[]> {
    return (await storage.getFiles()).map(({ file, parsed }) => {
      let v = fileCache.get(parsed);
      if (!v) {
        v = {
          type: parsed.type,
          path: baseDir ? path.join(baseDir, file) : file,
          absolutePath: path.resolve(config.dir, file),
          data: parsed.data,
        } as LocalVirtualFile;
        fileCache.set(parsed, v);
      }
      return v;
    });
  }

  return {
    dir: path.resolve(config.dir),
    include: config.include ?? config.integration.include,
    invalidateAll() {
      storage.clearCache();
    },
    invalidateFile(file) {
      storage.invalidateCache(path.resolve(file));
    },
    dynamicSource(options) {
      return {
        cache: 'custom',
        files: () => createFiles(options),
        invalidate() {
          storage.clearCache();
        },
      };
    },
    async staticSource(options) {
      return { files: await createFiles(options) };
    },
    async devServer(url) {
      const { watchWithDevServer } = await import('./dev/ws');
      await watchWithDevServer(this, { url });
    },
  };
}
