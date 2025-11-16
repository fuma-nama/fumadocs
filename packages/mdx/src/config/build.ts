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

export type BuildEnvironment = 'bundler' | 'runtime';

export interface LoadedConfig {
  collectionList: CollectionItem[];
  getCollection(name: string): CollectionItem | undefined;

  global: GlobalConfig;
  getMDXOptions(
    collection?: DocCollectionItem,
    environment?: BuildEnvironment,
  ): ProcessorOptions | Promise<ProcessorOptions>;
}

export type CollectionItem =
  | MetaCollectionItem
  | DocCollectionItem
  | DocsCollectionItem;

type PrimitiveCollectionItem<T extends DocCollection | MetaCollection> = Omit<
  T,
  'files'
> & {
  name: string;
  hasFile: (filePath: string) => boolean;
  isFileSupported: (filePath: string) => boolean;
  patterns: string[];
};

export type MetaCollectionItem = PrimitiveCollectionItem<MetaCollection>;
export type DocCollectionItem = PrimitiveCollectionItem<DocCollection>;

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
  config: AnyCollection,
): CollectionItem {
  if (config.type === 'docs') {
    return {
      ...config,
      name,
      meta: buildPrimitiveCollection(name, config.meta),
      docs: buildPrimitiveCollection(name, config.docs),
      hasFile(filePath) {
        return this.docs.hasFile(filePath) || this.meta.hasFile(filePath);
      },
    } as DocsCollectionItem;
  }

  return buildPrimitiveCollection(name, config) as CollectionItem;
}

function buildPrimitiveCollection<T extends DocCollection | MetaCollection>(
  name: string,
  { files, ...config }: T,
): PrimitiveCollectionItem<T> {
  const supportedFormats = SupportedFormats[config.type];
  const patterns = files ?? [`**/*.{${supportedFormats.join(',')}}`];
  let matchers: picomatch.Matcher[];

  return {
    ...config,
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

export function buildConfig(config: Record<string, unknown>): LoadedConfig {
  const collections = new Map<string, CollectionItem>();
  const loaded: GlobalConfig = {};

  for (const [k, v] of Object.entries(config)) {
    if (!v) {
      continue;
    }

    if (typeof v === 'object' && 'type' in v) {
      if (v.type === 'docs') {
        collections.set(k, buildCollection(k, v as DocsCollection));
        continue;
      }

      if (v.type === 'doc' || v.type === 'meta') {
        collections.set(
          k,
          buildCollection(k, v as MetaCollection | DocCollection),
        );
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
    collectionList: Array.from(collections.values()),
    getCollection(name: string) {
      return collections.get(name);
    },
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
