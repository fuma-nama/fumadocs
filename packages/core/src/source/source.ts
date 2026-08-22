import type { Awaitable } from '@/types';
import type { DynamicLoader } from './dynamic';
import type { StructuredData } from '@/mdx-plugins';
import type { LoaderOutput } from './loader';

export type SourceUnion<Config extends SourceConfig = SourceConfig> =
  | StaticSource<Config>
  | DynamicSource<Config>;

/**
 * @deprecated use `StaticSource<Config>` instead
 */
export type Source<Config extends SourceConfig = SourceConfig> = StaticSource<Config>;

export interface GenericSourceOptions {
  /** the base directory for generated virtual files */
  baseDir?: string;

  /**
   * when the source is attached to a new static loader, before loader output is accessible.
   *
   * can be called multiple times when attached to a dynamic loader.
   **/
  configureStatic?: (opts: { loader: LoaderOutput; source?: string }) => void;

  /**
   * when the source is attached to a dynamic loader.
   *
   * called at most once for each source object.
   **/
  configureDynamic?: (opts: { loader: DynamicLoader; source?: string }) => void;
}

export interface StaticSource<
  Config extends SourceConfig = SourceConfig,
> extends GenericSourceOptions {
  files: VirtualFile<Config>[];
}

/** one dynamic source object can only be used by one dynamic loader */
export type DynamicSource<Config extends SourceConfig = SourceConfig> = GenericSourceOptions & {
  /**
   * - `memory`: the dynamic loader's in-memory cache handles caching.
   * - `custom`: the source handles caching itself. When the newer result of `files()` is (shallowly) different from the previous result, the source is considered revalidated, and all associated properties will be re-computed.
   *
   * @default 'memory'
   **/
  cache?: 'memory' | 'custom';
  files: () => Awaitable<VirtualFile<Config>[]>;
  /** @deprecated use `configureDynamic` instead */
  configure?: (loader: DynamicLoader, opts: { source?: string }) => void;
  /** when the source is invalidated */
  invalidate?: () => void;
} & (
    | {
        cache?: 'memory';
        /** enable time-based revalidation, the previous result will be stale after the specified duration (ms) */
        staleTime?: number;
      }
    | {
        cache: 'custom';
      }
  );

type SourceConfig = {
  pageData: PageData;
  metaData: MetaData;
};

export interface MetaData {
  icon?: string | undefined;
  title?: string | undefined;
  root?: boolean | undefined;
  pages?: string[] | undefined;
  pagesIndex?: string | undefined;
  defaultOpen?: boolean | undefined;
  collapsible?: boolean | undefined;

  description?: string | undefined;
}

export interface PageData {
  icon?: string | undefined;
  title?: string | undefined;
  description?: string | undefined;

  structuredData?: StructuredData | (() => Awaitable<StructuredData>) | undefined;
}

export type VirtualFile<Config extends SourceConfig = SourceConfig> =
  | VirtualPage<Config['pageData']>
  | VirtualMeta<Config['metaData']>;

interface BaseVirtualFile {
  /**
   * Virtualized path (relative to content directory)
   *
   * @example `docs/page.mdx`
   */
  path: string;

  /**
   * Absolute path of the file
   */
  absolutePath?: string;
}

interface VirtualPage<Data extends PageData> extends BaseVirtualFile {
  type: 'page';
  /**
   * Specified Slugs for page
   */
  slugs?: string[];
  data: Data;
}

interface VirtualMeta<Data extends MetaData> extends BaseVirtualFile {
  type: 'meta';
  data: Data;
}

/**
 * @deprecated you can directly pass a record of source objects to `loader()`.
 */
export function multiple<T extends Record<string, StaticSource>>(
  sources: T,
): T extends Record<infer K extends string, StaticSource>
  ? {
      [k in K]: T[k] extends StaticSource<infer C>
        ? StaticSource<{
            metaData: C['metaData'] & { type: k };
            pageData: C['pageData'] & { type: k };
          }>
        : never;
    }
  : never {
  const out: Record<string, StaticSource> = {};
  for (const k in sources) {
    out[k] = {
      files: sources[k].files.map((file) => ({ ...file, data: { ...file.data, type: k } })),
    };
  }
  return out as never;
}

interface SourceUpdater<Config extends SourceConfig> {
  files: <Page extends PageData, Meta extends MetaData>(
    fn: (files: VirtualFile<Config>[]) => (VirtualPage<Page> | VirtualMeta<Meta>)[],
  ) => SourceUpdater<{
    pageData: Page;
    metaData: Meta;
  }>;
  page: <V extends PageData>(
    fn: (page: VirtualPage<Config['pageData']>) => VirtualPage<V>,
  ) => SourceUpdater<{
    pageData: V;
    metaData: Config['metaData'];
  }>;

  meta: <V extends MetaData>(
    fn: (meta: VirtualMeta<Config['metaData']>) => VirtualMeta<V>,
  ) => SourceUpdater<{
    pageData: Config['pageData'];
    metaData: V;
  }>;
  build: () => StaticSource<Config>;
}

/**
 * update a **static** source object in-place.
 */
export function update<Config extends SourceConfig>(
  source: StaticSource<Config>,
): SourceUpdater<Config> {
  return {
    files(fn) {
      source.files = fn(source.files);
      return this as SourceUpdater<never>;
    },
    page(fn) {
      for (let i = 0; i < source.files.length; i++) {
        const file = source.files[i];
        if (file.type === 'page') source.files[i] = fn(file);
      }

      return this as SourceUpdater<never>;
    },
    meta(fn) {
      for (let i = 0; i < source.files.length; i++) {
        const file = source.files[i];
        if (file.type === 'meta') source.files[i] = fn(file);
      }

      return this as SourceUpdater<never>;
    },
    build() {
      return source;
    },
  };
}

export function isStaticSource(s: object): s is StaticSource {
  return 'files' in s && Array.isArray(s.files);
}

export function isDynamicSource(s: object): s is DynamicSource {
  return 'files' in s && typeof s.files === 'function';
}
