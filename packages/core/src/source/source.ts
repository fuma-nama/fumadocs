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

/**
 * map virtual files in source
 */
export function map<Config extends SourceConfig>(source: Source<Config>) {
  return {
    page<$Page extends PageData>(
      fn: (entry: VirtualPage<Config['pageData']>) => VirtualPage<$Page>,
    ): Source<{
      pageData: $Page;
      metaData: Config['metaData'];
    }> {
      return {
        files: source.files.map((file) =>
          file.type === 'page' ? fn(file) : file,
        ),
      };
    },
    meta<$Meta extends MetaData>(
      fn: (entry: VirtualMeta<Config['metaData']>) => VirtualMeta<$Meta>,
    ): Source<{
      pageData: Config['pageData'];
      metaData: $Meta;
    }> {
      return {
        files: source.files.map((file) =>
          file.type === 'meta' ? fn(file) : file,
        ),
      };
    },
  };
}
