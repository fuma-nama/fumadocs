import type { ProcessorOptions } from '@mdx-js/mdx';
import type {
  AnyCollection,
  DocCollection,
  DocsCollection,
  GlobalConfig,
  MetaCollection,
} from '@/config/define';
import picomatch from 'picomatch';
import { applyMdxPreset } from '@/config/preset';
import path from 'node:path';

export type BuildEnvironment = 'bundler' | 'runtime';

export interface LoadedConfig {
  collections: Map<string, CollectionItem>;
  global: GlobalConfig;
  getMDXOptions(
    collection?: DocCollectionItem,
    environment?: BuildEnvironment,
  ): ProcessorOptions | Promise<ProcessorOptions>;
  workspaces: Record<
    string,
    {
      dir: string;
      config: LoadedConfig;
    }
  >;
}

export type CollectionItem =
  | MetaCollectionItem
  | DocCollectionItem
  | DocsCollectionItem;

interface PrimitiveCollectionItem {
  name: string;
  cwd: string;
  hasFile: (filePath: string) => boolean;
  isFileSupported: (filePath: string) => boolean;
  patterns: string[];
}

export type MetaCollectionItem = PrimitiveCollectionItem &
  Omit<MetaCollection, 'files'>;
export type DocCollectionItem = PrimitiveCollectionItem &
  Omit<DocCollection, 'files'>;

export interface DocsCollectionItem extends DocsCollection {
  name: string;
  meta: MetaCollectionItem;
  docs: DocCollectionItem;
  hasFile: (filePath: string) => boolean;
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
      name,
      meta: buildCollection(name, collection.meta, cwd),
      docs: buildCollection(name, collection.docs, cwd),
      hasFile(filePath) {
        return this.docs.hasFile(filePath) || this.meta.hasFile(filePath);
      },
    } as DocsCollectionItem;
  }

  if (collection.type === 'doc') {
    return {
      ...collection,
      ...buildPrimitiveCollection(name, collection, cwd),
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
  let matchers: picomatch.Matcher[];

  return {
    cwd,
    name,
    patterns,
    isFileSupported(filePath) {
      return supportedFormats.some((format) => filePath.endsWith(`.${format}`));
    },
    hasFile(filePath) {
      matchers ??= (Array.isArray(config.dir) ? config.dir : [config.dir]).map(
        (dir) =>
          picomatch(patterns, {
            cwd: dir,
          }),
      );

      return (
        this.isFileSupported(filePath) &&
        matchers.some((matcher) => matcher(filePath))
      );
    },
  };
}

export function buildConfig(
  config: Record<string, unknown>,
  cwd = process.cwd(),
): LoadedConfig {
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

  const mdxOptionsCache = new Map<
    string,
    ProcessorOptions | Promise<ProcessorOptions>
  >();
  return {
    global: loaded,
    collections,
    workspaces: Object.fromEntries(
      Object.entries(loaded.workspaces ?? {}).map(([key, value]) => {
        return [
          key,
          {
            dir: value.dir,
            config: buildConfig(value.config, path.join(cwd, value.dir)),
          },
        ];
      }),
    ),
    getMDXOptions(collection, environment = 'bundler') {
      const key = collection
        ? `${environment}:${collection.name}`
        : environment;
      const cached = mdxOptionsCache.get(key);
      if (cached) return cached;
      let result: ProcessorOptions | Promise<ProcessorOptions>;

      if (collection?.mdxOptions) {
        const optionsFn = collection.mdxOptions;
        result =
          typeof optionsFn === 'function' ? optionsFn(environment) : optionsFn;
      } else {
        result = (async () => {
          const optionsFn = this.global.mdxOptions;
          const options =
            typeof optionsFn === 'function' ? await optionsFn() : optionsFn;

          return applyMdxPreset(options)(environment);
        })();
      }

      mdxOptionsCache.set(key, result);
      return result;
    },
  };
}
