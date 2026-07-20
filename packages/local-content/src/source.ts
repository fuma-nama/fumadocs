import {
  type DynamicSource,
  type MetaData,
  type PageData,
  type StaticSource,
  type VirtualFile,
} from 'fumadocs-core/source';
import type { DynamicLoader } from 'fumadocs-core/source/dynamic';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import path from 'node:path';
import { createStorage, type RawPage, type StorageConfig } from './storage';
import { getDevServerUrlFromEnv } from './dev/shared';
import { defaultInclude } from './shared';
import type * as defaultSchemas from 'fumadocs-core/source/schema';

/**
 * A scanned content file, as exposed to Fumadocs' source API.
 *
 * `Loaded` is whatever {@link LocalSourceConfig.load} resolves to — a compiled
 * renderer, for the content sources built on this package.
 */
export interface LocalPage<Frontmatter = Record<string, unknown>, Loaded = unknown> {
  title: string;
  description?: string;
  icon?: string;
  content: string;
  frontmatter: Frontmatter;

  load: () => Promise<Loaded>;
}

export interface SourceOptions {
  /** base directory for virtual file paths */
  baseDir?: string;
}

export interface LocalSourceConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
  Loaded,
> extends StorageConfig<FrontmatterSchema, MetaSchema> {
  /**
   * Turn a scanned page into its loaded form, usually by compiling it.
   *
   * Called at most once per page: the returned promise is cached until the file
   * is invalidated, so `page.data.load()` is cheap to call repeatedly.
   */
  load: (page: RawPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>) => Promise<Loaded>;
}

export interface LocalSource<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
  Loaded,
> {
  /** connect to the dev server, required for hot reload */
  devServer: (url?: string) => Promise<void>;
  staticSource: (options?: SourceOptions) => Promise<
    StaticSource<{
      pageData: LocalPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, Loaded>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  >;
  dynamicSource: (options?: SourceOptions) => DynamicSource<{
    pageData: LocalPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, Loaded>;
    metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  }>;

  /** drop caches for a file, so the next read picks up its new content */
  invalidateFile: (file: string) => void;
}

export function createLocalSource<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
  Loaded = unknown,
>(
  config: LocalSourceConfig<FrontmatterSchema, MetaSchema, Loaded>,
): LocalSource<FrontmatterSchema, MetaSchema, Loaded> {
  type $Page = RawPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>;
  type $Files = VirtualFile<{
    pageData: LocalPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, Loaded>;
    metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  }>[];

  const storage = createStorage(config);
  // keyed on the page object, which storage replaces when a file is invalidated
  const loadCache = new WeakMap<$Page, Promise<Loaded>>();
  const registeredLoaders = new Set<DynamicLoader>();
  let cachedStaticSource: Promise<StaticSource<never>> | null = null;

  async function createFiles(options?: SourceOptions): Promise<$Files> {
    const { metas, pages } = await storage.getPages();
    const baseDir = options?.baseDir;
    const files: $Files = [];

    for (const page of pages) {
      const frontmatter = page.frontmatter as PageData & { _openapi?: unknown };

      files.push({
        type: 'page',
        path: baseDir ? path.join(baseDir, page.path) : page.path,
        absolutePath: page.absolutePath,
        data: {
          title: frontmatter.title ?? path.basename(page.path, path.extname(page.path)),
          description: frontmatter.description,
          icon: frontmatter.icon,
          // for Fumadocs OpenAPI
          ['_openapi' as never]: frontmatter._openapi,

          content: page.content,
          frontmatter: page.frontmatter,
          load() {
            let promise = loadCache.get(page);
            if (!promise) {
              promise = config.load(page);
              loadCache.set(page, promise);
            }

            return promise;
          },
        },
      });
    }

    for (const meta of metas) {
      files.push({
        type: 'meta',
        path: baseDir ? path.join(baseDir, meta.path) : meta.path,
        absolutePath: meta.absolutePath,
        data: meta.data!,
      });
    }

    return files;
  }

  return {
    invalidateFile(file) {
      cachedStaticSource = null;
      storage.invalidateCache(path.resolve(file));
      for (const loader of registeredLoaders) loader.invalidate();
    },
    async devServer(url = getDevServerUrlFromEnv()) {
      if (!url) {
        console.warn(
          `[@fumadocs/local-content] dev server URL could not be found, try passing the URL to devServer() explicitly instead`,
        );
        return;
      }

      const { connectDevServer } = await import('./dev/node-client');
      const conn = connectDevServer(url);
      conn.send({
        type: 'watch-dir',
        dir: path.resolve(config.dir),
        includes: config.include ?? defaultInclude,
      });

      conn.subscribe((event) => {
        if (event.type === 'change') {
          this.invalidateFile(event.absolutePath);
        }
      });
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
      return (cachedStaticSource ??= createFiles(options).then((files) => ({
        files,
      })) as Promise<StaticSource<never>>) as ReturnType<
        LocalSource<FrontmatterSchema, MetaSchema, Loaded>['staticSource']
      >;
    },
  };
}
