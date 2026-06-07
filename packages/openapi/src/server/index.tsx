import { createProxy } from '@/server/proxy';
import { loadDocument } from '@/utils/document/load';
import type { Document } from '@/types';
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
  type WebhookOutput,
} from '@/utils/pages/builder';
import { toStaticData } from '@/utils/pages/to-static-data';
import path from 'node:path';
import type { OpenAPIPageProps } from '@/ui';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { MethodLabel } from '@/ui/components/method-label';
import type { Awaitable } from 'shiki';

/**
 * schema ID -> file path, URL, downloaded schema object, or a function returning them
 */
type SchemaRecord = Record<string, string | Document | (() => Awaitable<string | Document>)>;
interface LoadedDocument {
  bundled: Document;
}

export interface OpenAPIOptions {
  /**
   * Schema files, can be:
   * - URL
   * - file path
   * - a schema record object
   */
  input?: string[] | SchemaRecord;

  disableCache?: boolean;

  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;
}

export interface OpenAPIServer {
  createProxy: typeof createProxy;
  getSchemas: () => Promise<Record<string, LoadedDocument>>;
  getSchema: (document: string) => Promise<LoadedDocument>;
  readonly options: OpenAPIOptions;

  /**
   * Generate virtual pages for Fumadocs Source API
   */
  staticSource: (
    options?: OpenAPISourceOptions,
  ) => Promise<Source<{ metaData: MetaData; pageData: OpenAPIPageData }>>;

  /**
   * Generate virtual pages for Fumadocs Source API (note: please disable cache to allow built-in revalidation)
   */
  dynamicSource: (
    options?: OpenAPISourceOptions,
  ) => DynamicSource<{ metaData: MetaData; pageData: OpenAPIPageData }>;

  preloadOpenAPIPage: <Type extends string | undefined, Data extends PageData>(
    page: Page<Type, Data>,
  ) => Promise<Pick<Extract<OpenAPIPageProps, { preloaded: unknown }>, 'preloaded'>>;

  /**
   * Fumadocs Source API integration, pass this to `plugins` array in `loader()`.
   */
  loaderPlugin: () => LoaderPlugin;

  /** @private internal API */
  _getWatchPaths: () => string[];
}

export interface OpenAPIPageData extends PageData {
  getOpenAPIPageProps: () => Extract<OpenAPIPageProps, { payload: unknown }>;
  getSchema: () => { id: string; bundled: Document };
  structuredData: StructuredData;
  toc: TOCItemType[];
  _openapi: InternalOpenAPIMeta;
}

export type OpenAPISourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  /** Generate `meta.json` files */
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
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
        `[Fumadocs OpenAPI] the document "${schemaId}" is not listed in the input array, this may be unexpected and won't be cached properly.`,
      );
      // do not cache unlisted documents
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

  async function getVirtualFiles(server: OpenAPIServer, options: OpenAPISourceOptions) {
    const { baseDir = '', meta = false } = options;
    const { createAutoPreset } = await import('@/utils/pages/preset-auto');
    const { fromSchema } = await import('@/utils/pages/builder');
    const files: VirtualFile<{
      pageData: OpenAPIPageData;
      metaData: MetaData;
    }>[] = [];

    const schemas = await server.getSchemas();
    const builderOptions = createAutoPreset(options);

    for (const [id, schema] of Object.entries(schemas)) {
      const list = fromSchema(id, schema.bundled, builderOptions);

      onEntries(list);

      function onEntry(entry: PageOutput | OperationOutput | WebhookOutput) {
        const props = getPageProps(entry);

        files.push({
          type: 'page',
          path: `${baseDir}/${entry.path}`,
          data: {
            ...entry.info,
            getOpenAPIPageProps() {
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
            _openapi: {
              method:
                entry.type === 'operation' || entry.type === 'webhook'
                  ? entry.item.method
                  : undefined,
              webhook: entry.type === 'webhook',
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
    async preloadOpenAPIPage(page) {
      const out: Extract<OpenAPIPageProps, { preloaded: unknown }>['preloaded'] = {
        docs: {},
        proxyUrl: options.proxyUrl,
      };
      const openapiMeta = (page.data as { _openapi?: InternalOpenAPIMeta })._openapi;
      if (openapiMeta?.preload) {
        out.docs = Object.fromEntries(
          await Promise.all(
            openapiMeta.preload.map(async (k) => [k, (await getSchema(k)).bundled]),
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
      return openapiPlugin();
    },
  };
}

export interface InternalOpenAPIMeta {
  method?: string;
  webhook?: boolean;
  deprecated?: boolean;
  preload?: string[];
}

/**
 * Fumadocs Source API integration, pass this to `plugins` array in `loader()`.
 */
export function openapiPlugin(): LoaderPlugin {
  return {
    name: 'fumadocs:openapi',
    enforce: 'pre',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (!file || file.format !== 'page') return node;

        const openApiData = (file.data as { _openapi?: InternalOpenAPIMeta })._openapi;
        if (!openApiData || typeof openApiData !== 'object') return node;

        if (openApiData.deprecated) {
          node.name = <span className="fd-page-tree-item-name line-through">{node.name}</span>;
        }

        if (openApiData.webhook) {
          node.name = (
            <>
              {node.name}{' '}
              <span className="ms-auto border border-current px-1 rounded-lg text-xs text-nowrap font-mono">
                Webhook
              </span>
            </>
          );
        } else if (openApiData.method) {
          node.name = (
            <>
              {node.name}{' '}
              <MethodLabel className="ms-auto text-xs text-nowrap">
                {openApiData.method}
              </MethodLabel>
            </>
          );
        }

        return node;
      },
    },
  };
}

/**
 * Generate virtual pages for Fumadocs Source API
 */
export async function openapiSource(server: OpenAPIServer, options: OpenAPISourceOptions = {}) {
  return server.staticSource(options);
}

export type { CreateProxyOptions, Proxy } from './proxy';
