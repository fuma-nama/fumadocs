import { createProxy } from '@/server/proxy';
import { processDocument, type ProcessedDocument } from '@/utils/document/process';
import type { Document } from '@/types';
import type { InlineCodeUsageGenerator } from '@/requests/generators';
import fs from 'node:fs';
import {
  type DynamicSource,
  type LoaderPlugin,
  type PageData,
  type PageTreeTransformer,
  PathUtils,
  type MetaData,
  type Source,
  type VirtualFile,
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
import type { DereferencedDocument } from '@/utils/document/dereference';
import type { ApiPageProps } from '@/ui/api-page';
import type { ClientApiPageProps } from '@/ui/create-client';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { MethodLabel } from '@/ui/components/method-label';

/**
 * schema id -> file path, URL, or downloaded schema object
 */
type SchemaMap = Record<string, string | Document>;
type ProcessedSchemaMap = Record<string, ProcessedDocument>;

export interface OpenAPIOptions {
  /**
   * Schema files, can be:
   * - URL
   * - file path
   * - a function returning records of downloaded schemas.
   */
  input?: string[] | (() => SchemaMap | Promise<SchemaMap>);

  disableCache?: boolean;

  /**
   * The url of proxy to avoid CORS issues
   */
  proxyUrl?: string;
}

export interface OpenAPIServer {
  createProxy: typeof createProxy;
  getSchemas: () => Promise<ProcessedSchemaMap>;
  getSchema: (document: string) => Promise<ProcessedDocument>;
  readonly options: OpenAPIOptions;

  /**
   * Generate virtual pages for Fumadocs Source API
   */
  staticSource: (
    options?: OpenAPISourceOptions,
  ) => Promise<Source<{ metaData: MetaData; pageData: OpenAPIPageData }>>;

  /**
   * Generate virtual pages for Fumadocs Source API
   */
  dynamicSource: (
    options?: OpenAPISourceOptions,
  ) => DynamicSource<{ metaData: MetaData; pageData: OpenAPIPageData }>;

  /**
   * Fumadocs Source API integration, pass this to `plugins` array in `loader()`.
   */
  loaderPlugin: () => LoaderPlugin;

  /** @private internal API */
  _getWatchPaths: () => string[];
}

export interface OpenAPIPageData extends PageData {
  getAPIPageProps: () => ApiPageProps;
  getSchema: () => { id: string } & DereferencedDocument;
  getClientAPIPageProps: () => Promise<ClientApiPageProps>;
  structuredData: StructuredData;
  toc: TOCItemType[];
}

export type OpenAPISourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  /** Generate `meta.json` files */
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createOpenAPI(options: OpenAPIOptions = {}): OpenAPIServer {
  const { input = [], disableCache = false } = options;
  let schemas: Promise<ProcessedSchemaMap> | undefined;

  async function getSchemas(): Promise<ProcessedSchemaMap> {
    if (Array.isArray(input)) {
      const entries = await Promise.all(
        input.map(async (item) => [item, await processDocument(item)]),
      );
      return Object.fromEntries(entries);
    } else {
      const entries = await Promise.all(
        Object.entries(await input()).map(async ([k, v]) => [k, await processDocument(v)]),
      );
      return Object.fromEntries(entries);
    }
  }

  async function getVirtualFiles(server: OpenAPIServer, options: OpenAPISourceOptions) {
    const { baseDir = '', meta = false } = options;
    const { createAutoPreset } = await import('@/utils/pages/preset-auto');
    const { fromServer } = await import('@/utils/pages/builder');
    const files: VirtualFile<{
      pageData: OpenAPIPageData;
      metaData: MetaData;
    }>[] = [];

    const entries = await fromServer(server, createAutoPreset(options));
    for (const [schemaId, list] of Object.entries(entries)) {
      const processed = await server.getSchema(schemaId);

      function onEntry(entry: PageOutput | OperationOutput | WebhookOutput) {
        const props = getPageProps(entry);

        files.push({
          type: 'page',
          path: `${baseDir}/${entry.path}`,
          data: {
            ...entry.info,
            getAPIPageProps() {
              return props;
            },
            async getClientAPIPageProps() {
              return {
                payload: {
                  bundled: processed.bundled,
                  proxyUrl: server.options.proxyUrl,
                },
                ...props,
              };
            },
            getSchema() {
              return {
                id: schemaId,
                ...processed,
              };
            },
            ...toStaticData(props, processed.dereferenced),
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

      onEntries(list);
    }

    return files;
  }

  return {
    options,
    createProxy,
    _getWatchPaths() {
      const keys = Array.isArray(input) ? input : Object.keys(input);
      return keys.filter((key) => !URL.canParse(key) && fs.existsSync(key));
    },
    async getSchema(document) {
      const schemas = await this.getSchemas();
      if (document in schemas) return schemas[document];

      console.warn(
        `[Fumadocs OpenAPI] the document "${document}" is not listed in the input array, this may not be expected.`,
      );
      // do not cache unlisted documents
      return processDocument(document);
    },
    async getSchemas() {
      if (disableCache) return getSchemas();

      return (schemas ??= getSchemas());
    },
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

/**
 * @deprecated
 */
export function createCodeSample<T>(
  options: InlineCodeUsageGenerator<T>,
): InlineCodeUsageGenerator<T> {
  return options;
}

declare module 'fumadocs-core/source' {
  export interface PageData {
    /**
     * Added by Fumadocs OpenAPI
     */
    _openapi?: InternalOpenAPIMeta;
  }
}

export interface InternalOpenAPIMeta {
  method?: string;
  webhook?: boolean;
  deprecated?: boolean;
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

        const openApiData = file.data._openapi;
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

/**
 * @deprecated use `openapiPlugin()`
 */
export function transformerOpenAPI(): PageTreeTransformer {
  return openapiPlugin().transformPageTree!;
}
