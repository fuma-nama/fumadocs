import type {
  DynamicSource,
  MetaData,
  PageData,
  StaticSource,
  VirtualFile,
} from 'fumadocs-core/source';
import type { DynamicLoader } from 'fumadocs-core/source/dynamic';
import path from 'node:path';
import { createStorage } from './storage';
import type { ContentIntegration } from './integration';

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
  type $Files = VirtualFile<{ pageData: Page; metaData: Meta }>[];

  const storage = createStorage(config);
  const registeredLoaders = new Set<DynamicLoader>();
  let cachedStaticSource: Promise<StaticSource<{ pageData: Page; metaData: Meta }>> | null = null;

  function invalidate() {
    cachedStaticSource = null;
    for (const loader of registeredLoaders) loader.invalidate();
  }

  async function createFiles(options?: SourceOptions): Promise<$Files> {
    const baseDir = options?.baseDir;
    const files: $Files = [];

    for (const { file, parsed } of await storage.getFiles()) {
      files.push({
        type: parsed.type,
        path: baseDir ? path.join(baseDir, file) : file,
        absolutePath: path.resolve(config.dir, file),
        data: parsed.data,
      } as $Files[number]);
    }

    return files;
  }

  return {
    dir: path.resolve(config.dir),
    include: config.include ?? config.integration.include,
    invalidateAll() {
      storage.clearCache();
      invalidate();
    },
    invalidateFile(file) {
      storage.invalidateCache(path.resolve(file));
      invalidate();
    },
    dynamicSource(options) {
      return {
        files: () => createFiles(options),
        configure(loader) {
          registeredLoaders.add(loader);
        },
      };
    },
    staticSource(options) {
      return (cachedStaticSource ??= createFiles(options).then((files) => ({ files })));
    },
    async devServer(url) {
      const { watchWithDevServer } = await import('./dev/ws');
      await watchWithDevServer(this, { url });
    },
  };
}
