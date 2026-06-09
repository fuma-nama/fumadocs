import { createProxy } from '@/server/proxy';
import { loadDocument } from '@/utils/document/load';
import type { AsyncAPIObject, Awaitable } from '@/types';
import fs from 'node:fs';
import {
  type DynamicSource,
  type LoaderPlugin,
  type PageData,
  PathUtils,
  type MetaData,
  type Source,
  type VirtualFile,
  type Page,
} from 'fumadocs-core/source';
import {
  getPageProps,
  type OperationOutput,
  type OutputEntry,
  type PageOutput,
} from '@/utils/pages/builder';
import { toStaticData } from '@/utils/pages/to-static-data';
import path from 'node:path';
import type { AsyncAPIPageProps_Preloaded, AsyncAPIPageProps_Spec } from '@/ui';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { ActionLabel } from '@/ui/components/badge';

type SchemaRecord = Record<
  string,
  string | AsyncAPIObject | (() => Awaitable<string | AsyncAPIObject>)
>;
interface LoadedDocument {
  bundled: AsyncAPIObject;
}

export interface AsyncAPIOptions {
  input?: string[] | SchemaRecord;
  disableCache?: boolean;
  proxyUrl?: string;
}

export type { AsyncAPIPageProps_Spec, AsyncAPIPageProps_Preloaded };

export interface AsyncAPIServer {
  createProxy: typeof createProxy;
  getSchemas: () => Promise<Record<string, LoadedDocument>>;
  getSchema: (document: string) => Promise<LoadedDocument>;
  readonly options: AsyncAPIOptions;
  staticSource: (
    options?: AsyncAPISourceOptions,
  ) => Promise<Source<{ metaData: MetaData; pageData: AsyncAPIPageData }>>;
  dynamicSource: (
    options?: AsyncAPISourceOptions,
  ) => DynamicSource<{ metaData: MetaData; pageData: AsyncAPIPageData }>;
  preloadAsyncAPIPage: <Type extends string | undefined, Data extends PageData>(
    page: Page<Type, Data>,
  ) => Promise<Pick<AsyncAPIPageProps_Preloaded, 'preloaded'>>;
  loaderPlugin: () => LoaderPlugin;
  _getWatchPaths: () => string[];
}

export interface AsyncAPIPageData extends PageData {
  getAsyncAPIPageProps: () => AsyncAPIPageProps_Spec;
  getSchema: () => { id: string; bundled: AsyncAPIObject };
  structuredData: StructuredData;
  toc: TOCItemType[];
  _asyncapi: InternalAsyncAPIMeta;
}

export type AsyncAPISourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createAsyncAPI(options: AsyncAPIOptions = {}): AsyncAPIServer {
  const { disableCache = false } = options;
  const schemaMap = new Map<string, Promise<LoadedDocument>>();

  let resolvedInput: SchemaRecord = {};
  if (Array.isArray(options.input)) {
    for (const item of options.input) resolvedInput[item] = item;
  } else if (options.input) {
    resolvedInput = options.input;
  }

  function getSchema(schemaId: string): Promise<LoadedDocument> {
    if (!(schemaId in resolvedInput)) {
      console.warn(
        `[Fumadocs AsyncAPI] the document "${schemaId}" is not listed in the input array, this may be unexpected and won't be cached properly.`,
      );
      return loadDocument(schemaId);
    }

    if (!disableCache) {
      const cached = schemaMap.get(schemaId);
      if (cached) return cached;
    }

    const raw = resolvedInput[schemaId];
    const output = Promise.resolve(typeof raw === 'function' ? raw() : raw).then(loadDocument);
    if (!disableCache) schemaMap.set(schemaId, output);
    return output;
  }

  async function getSchemas(): Promise<Record<string, LoadedDocument>> {
    const entries = await Promise.all(
      Object.keys(resolvedInput).map(async (k) => [k, await getSchema(k)]),
    );
    return Object.fromEntries(entries);
  }

  async function getVirtualFiles(server: AsyncAPIServer, options: AsyncAPISourceOptions) {
    const { baseDir = '', meta = false } = options;
    const { createAutoPreset } = await import('@/utils/pages/preset-auto');
    const { fromSchema } = await import('@/utils/pages/builder');
    const files: VirtualFile<{
      pageData: AsyncAPIPageData;
      metaData: MetaData;
    }>[] = [];

    const schemas = await server.getSchemas();
    const builderOptions = createAutoPreset(options);

    for (const [id, schema] of Object.entries(schemas)) {
      const list = fromSchema(id, schema.bundled, builderOptions);

      onEntries(list);

      function onEntry(entry: PageOutput | OperationOutput) {
        const props = getPageProps(entry);

        files.push({
          type: 'page',
          path: `${baseDir}/${entry.path}`,
          data: {
            ...entry.info,
            getAsyncAPIPageProps() {
              return {
                payload: {
                  bundled: schema.bundled,
                  proxyUrl: server.options.proxyUrl,
                },
                ...props,
              };
            },
            getSchema() {
              return {
                id,
                bundled: schema.bundled,
              };
            },
            ...toStaticData(props, schema.bundled),
            _asyncapi: {
              action: entry.type === 'operation' ? entry.item.action : undefined,
              deprecated: entry.info.deprecated,
            },
          },
        });
      }

      function onEntries(entries: OutputEntry[], parent?: OutputEntry) {
        if (!meta) {
          for (const entry of entries) {
            if (entry.type === 'group') {
              onEntries(entry.entries, entry);
            } else {
              onEntry(entry);
            }
          }

          return;
        }

        const { folderStyle = 'folder' } = meta === true ? {} : meta;
        const pages: string[] = [];

        for (const entry of entries) {
          const relativePath = PathUtils.slash(
            parent ? path.relative(parent.path, entry.path) : entry.path,
          );

          if (entry.type === 'group') {
            onEntries(entry.entries, entry);
            if (folderStyle === 'folder') {
              pages.push(relativePath);
            } else {
              pages.push(`---${entry.info.title}---`, `...${relativePath}`);
            }
          } else {
            onEntry(entry);
            pages.push(relativePath.slice(0, -path.extname(entry.path).length));
          }
        }

        if (pages.length === 0) return;
        files.push({
          type: 'meta',
          path: path.join(baseDir, parent?.path ?? '', 'meta.json'),
          data: {
            title: parent?.info.title,
            description: parent?.info.description,
            pages,
          },
        });
      }
    }

    return files;
  }

  return {
    options,
    createProxy,
    _getWatchPaths() {
      return Object.keys(resolvedInput).filter((key) => !URL.canParse(key) && fs.existsSync(key));
    },
    async preloadAsyncAPIPage(page) {
      const out: AsyncAPIPageProps_Preloaded['preloaded'] = {
        docs: {},
        proxyUrl: options.proxyUrl,
      };
      const asyncapiMeta = (page.data as { _asyncapi?: InternalAsyncAPIMeta })._asyncapi;
      if (asyncapiMeta?.preload) {
        out.docs = Object.fromEntries(
          await Promise.all(
            asyncapiMeta.preload.map(async (k) => [k, (await getSchema(k)).bundled]),
          ),
        );
      }

      return { preloaded: out };
    },
    getSchema,
    getSchemas,
    async staticSource(options = {}) {
      return {
        files: await getVirtualFiles(this, options),
      };
    },
    dynamicSource(options = {}) {
      return {
        files: () => getVirtualFiles(this, options),
      };
    },
    loaderPlugin() {
      return asyncapiPlugin();
    },
  };
}

export interface InternalAsyncAPIMeta {
  action?: string;
  deprecated?: boolean;
  preload?: string[];
}

export function asyncapiPlugin(): LoaderPlugin {
  return {
    name: 'fumadocs:asyncapi',
    enforce: 'pre',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (!file || file.format !== 'page') return node;

        const asyncapiData = (file.data as { _asyncapi?: InternalAsyncAPIMeta })._asyncapi;
        if (!asyncapiData || typeof asyncapiData !== 'object') return node;

        if (asyncapiData.deprecated) {
          node.name = <span className="fd-page-tree-item-name line-through">{node.name}</span>;
        }

        if (asyncapiData.action) {
          node.name = (
            <>
              {node.name}{' '}
              <ActionLabel className="ms-auto text-xs text-nowrap">
                {asyncapiData.action}
              </ActionLabel>
            </>
          );
        }

        return node;
      },
    },
  };
}

export type { CreateProxyOptions, Proxy } from './proxy';
