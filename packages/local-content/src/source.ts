import {
  getStaticParams,
  type DynamicSource,
  type MetaData,
  type PageData,
  type Params,
  type StaticSource,
  type VirtualFile,
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
  /** drop the caches of a file & the files depending on it, returns whether the source uses the file */
  invalidateFile: (file: string) => boolean;
  /**
   * Listen to the files that parsed files depend on (e.g. included files), to watch them along with {@link dir}.
   *
   * The listener is called with the known files first.
   */
  onDependency: (listener: (file: string) => void) => () => void;
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
  /** the data of a dynamic file at each params, cached with the parsed file like its data */
  const dataCache = new WeakMap<ParsedFile<Page, Meta>, Map<string, Page | Meta>>();
  const storage = createStorage(config);

  async function createFiles({ baseDir }: SourceOptions = {}): Promise<LocalVirtualFile[]> {
    const files = await storage.getFiles();
    const mount = (file: string) => (baseDir ? path.join(baseDir, file) : file);
    // params come from the mounted paths, like the loader reads them
    const metaParams = new Map<string, Params[] | undefined>();
    for (const { file, parsed } of files)
      if (parsed.type === 'meta')
        metaParams.set(mount(file.slice(0, -path.extname(file).length)), parsed.data.staticParams);

    return Promise.all(
      files.map(async ({ file, parsed }) => {
        let v = fileCache.get(parsed);
        if (!v) {
          const location = {
            path: mount(file),
            absolutePath: path.resolve(config.dir, file),
          };
          v =
            parsed.type === 'page'
              ? { type: 'page', data: parsed.data, ...location }
              : { type: 'meta', data: parsed.data, ...location };
          fileCache.set(parsed, v);
        }
        if (!parsed.dataAt) return v;

        // the loader reads data synchronously, so the async data of each params, like frontmatter in code, is ready first
        const cache = dataCache.get(parsed) ?? new Map<string, Page | Meta>();
        dataCache.set(parsed, cache);
        const { dataAt } = parsed;
        const params = getStaticParams(v.path, {
          staticParams: parsed.data.staticParams,
          readStaticParams: (meta) => metaParams.get(meta),
        });
        await Promise.all(
          (params ?? []).map(async (item) => {
            const key = JSON.stringify(item);
            if (!cache.has(key)) cache.set(key, await dataAt(item));
          }),
        );
        // the data of the type of the file, custom props are bound when a page is requested
        v.dataAt = ((item: Params, custom?: { props: Record<string, unknown>; data: Page }) =>
          custom && parsed.type === 'page'
            ? dataAt(item, custom as never)
            : cache.get(JSON.stringify(item))) as never;
        return v;
      }),
    );
  }

  return {
    dir: path.resolve(config.dir),
    include: config.include ?? config.integration.include,
    invalidateAll() {
      storage.clearCache();
    },
    invalidateFile(file) {
      return storage.invalidate(path.resolve(file));
    },
    onDependency: storage.onDependency,
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
