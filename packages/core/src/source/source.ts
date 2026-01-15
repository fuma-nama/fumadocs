export interface Source<Config extends SourceConfig = SourceConfig> {
  files: VirtualFile<Config>[];
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

export type _ConfigUnion_<T extends Record<string, Source>> = {
  [K in keyof T]: T[K] extends Source<infer Config>
    ? {
        pageData: Config['pageData'] & { type: K };
        metaData: Config['metaData'] & { type: K };
      }
    : never;
}[keyof T];

export function multiple<T extends Record<string, Source>>(sources: T) {
  const out: Source<_ConfigUnion_<T>> = { files: [] };

  for (const [type, source] of Object.entries(sources)) {
    for (const file of source.files) {
      out.files.push({
        ...file,
        data: {
          ...file.data,
          type,
        },
      });
    }
  }

  return out;
}

export function source<Page extends PageData, Meta extends MetaData>(config: {
  pages: VirtualPage<Page>[];
  metas: VirtualMeta<Meta>[];
}): Source<{
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
  build: () => Source<Config>;
}

/**
 * update a source object in-place.
 */
export function update<Config extends SourceConfig>(
  source: Source<Config>,
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
