import type {
  AnyCollection,
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config/define';
import picomatch from 'picomatch';
import path from 'node:path';

export type BuildEnvironment = 'bundler' | 'runtime';

export interface LoadedConfig {
  collections: Map<string, CollectionItem>;
  global: GlobalConfig;
  workspaces: Record<
    string,
    {
      dir: string;
      config: LoadedConfig;
    }
  >;
}

export type CollectionItem = MetaCollectionItem | DocCollectionItem | DocsCollectionItem;

interface PrimitiveCollectionItem {
  name: string;
  cwd: string;
  /**
   * content directory (absolute)
   */
  dir: string;
  hasFile: (filePath: string) => boolean;
  isFileSupported: (filePath: string) => boolean;
  patterns: string[];
}

export type MetaCollectionItem = PrimitiveCollectionItem & Omit<MetaCollection, 'files' | 'dir'>;
export type DocCollectionItem = PrimitiveCollectionItem & Omit<DocCollection, 'files' | 'dir'>;

export interface DocsCollectionItem
  extends Omit<DocsCollection, 'dir' | 'meta' | 'docs'>, Omit<PrimitiveCollectionItem, 'patterns'> {
  meta: MetaCollectionItem;
  docs: DocCollectionItem;
}

const SupportedFormats = {
  doc: ['mdx', 'md'],
  meta: ['json', 'yaml'],
};

export function buildCollection(
  name: string,
  collection: AnyCollection,
  cwd: string,
): CollectionItem {
  if (collection.type === 'docs') {
    return {
      ...collection,
      type: 'docs',
      get dir() {
        return this.docs.dir;
      },
      name,
      meta: buildCollection(name, collection.meta, cwd) as MetaCollectionItem,
      docs: buildCollection(name, collection.docs, cwd) as DocCollectionItem,
      hasFile(filePath) {
        return this.docs.hasFile(filePath) || this.meta.hasFile(filePath);
      },
      isFileSupported(filePath) {
        return this.docs.isFileSupported(filePath) || this.meta.isFileSupported(filePath);
      },
      cwd,
    };
  }

  return {
    ...collection,
    ...buildPrimitiveCollection(name, collection, cwd),
  };
}

function buildPrimitiveCollection(
  name: string,
  config: DocCollection | MetaCollection,
  cwd: string,
): PrimitiveCollectionItem {
  const supportedFormats = SupportedFormats[config.type];
  const patterns = config.files ?? [`**/*.{${supportedFormats.join(',')}}`];
  let matcher: picomatch.Matcher;

  return {
    dir: path.resolve(cwd, config.dir),
    cwd,
    name,
    patterns,
    isFileSupported(filePath) {
      return supportedFormats.some((format) => filePath.endsWith(`.${format}`));
    },
    hasFile(filePath) {
      if (!this.isFileSupported(filePath)) return false;

      const relativePath = path.relative(this.dir, filePath);
      if (relativePath.startsWith(`..${path.sep}`)) return false;

      return (matcher ??= picomatch(patterns))(relativePath);
    },
  };
}

export function buildConfig(config: Record<string, unknown>, cwd: string): LoadedConfig {
  const collections = new Map<string, CollectionItem>();
  const loaded: GlobalConfig = {};

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && 'type' in v) {
      if (v.type === 'docs' || v.type === 'doc' || v.type === 'meta') {
        collections.set(k, buildCollection(k, v as AnyCollection, cwd));
        continue;
      }
    }

    if (k === 'default' && v) {
      Object.assign(loaded, v);
      continue;
    }

    throw new Error(
      `Unknown export "${k}", you can only export collections from source configuration file.`,
    );
  }

  return {
    global: loaded,
    collections,
    workspaces: Object.fromEntries(
      Object.entries(loaded.workspaces ?? {}).map(([key, value]) => {
        return [
          key,
          {
            dir: value.dir,
            config: buildConfig(value.config, path.resolve(cwd, value.dir)),
          },
        ];
      }),
    ),
  };
}
