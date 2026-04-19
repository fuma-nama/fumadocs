import type { Awaitable } from '@/types';
import type { DynamicLoader } from './dynamic';

export type SourceUnion<Config extends SourceConfig = SourceConfig> =
  | StaticSource<Config>
  | DynamicSource<Config>;

/**
 * @deprecated use `StaticSource<Config>` instead
 */
export type Source<Config extends SourceConfig = SourceConfig> = StaticSource<Config>;

export interface StaticSource<Config extends SourceConfig = SourceConfig> {
  files: VirtualFile<Config>[];
}

export interface DynamicSource<Config extends SourceConfig = SourceConfig> {
  files: () => Awaitable<VirtualFile<Config>[]>;
  configure: (loader: DynamicLoader) => void;
}

export interface SourceConfig {
  pageData: PageData;
  metaData: MetaData;
}

export interface MetaData {
  icon?: string | undefined;
  title?: string | undefined;
  root?: boolean | undefined;
  pages?: string[] | undefined;
  defaultOpen?: boolean | undefined;
  collapsible?: boolean | undefined;

  description?: string | undefined;
}

export interface PageData {
  icon?: string | undefined;
  title?: string;
  description?: string | undefined;
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
export function multiple<T extends Record<string, StaticSource>>(sources: T): T {
  return sources;
}

export function source<Page extends PageData, Meta extends MetaData>(config: {
  pages: VirtualPage<Page>[];
  metas: VirtualMeta<Meta>[];
}): StaticSource<{
  pageData: Page;
  metaData: Meta;
}> {
  return {
    files: [...config.pages, ...config.metas],
  };
}

export interface _SourceUpdate_<Config extends SourceConfig> {
  files: <Page extends PageData, Meta extends MetaData>(
    fn: (files: VirtualFile<Config>[]) => (VirtualPage<Page> | VirtualMeta<Meta>)[],
  ) => _SourceUpdate_<{
    pageData: Page;
    metaData: Meta;
  }>;
  page: <V extends PageData>(
    fn: (page: VirtualPage<Config['pageData']>) => VirtualPage<V>,
  ) => _SourceUpdate_<{
    pageData: V;
    metaData: Config['metaData'];
  }>;

  meta: <V extends MetaData>(
    fn: (meta: VirtualMeta<Config['metaData']>) => VirtualMeta<V>,
  ) => _SourceUpdate_<{
    pageData: Config['pageData'];
    metaData: V;
  }>;
  build: () => StaticSource<Config>;
}

/**
 * update a source object in-place.
 */
export function update<Config extends SourceConfig>(
  source: StaticSource<Config>,
): _SourceUpdate_<Config> {
  return {
    files(fn) {
      source.files = fn(source.files);
      return this as _SourceUpdate_<never>;
    },
    page(fn) {
      for (let i = 0; i < source.files.length; i++) {
        const file = source.files[i];
        if (file.type === 'page') source.files[i] = fn(file);
      }

      return this as _SourceUpdate_<never>;
    },
    meta(fn) {
      for (let i = 0; i < source.files.length; i++) {
        const file = source.files[i];
        if (file.type === 'meta') source.files[i] = fn(file);
      }

      return this as _SourceUpdate_<never>;
    },
    build() {
      return source;
    },
  };
}

export function isStaticSource(s: object): s is StaticSource {
  return 'files' in s && Array.isArray(s.files);
}
