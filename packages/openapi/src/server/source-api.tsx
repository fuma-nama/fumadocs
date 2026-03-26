import { MethodLabel } from '@/ui/components/method-label';
import {
  PathUtils,
  type LoaderPlugin,
  type MetaData,
  type PageData,
  type PageTreeTransformer,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import type { ApiPageProps } from '@/ui/api-page';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ProcessedDocument } from '@/utils/process-document';
import type {
  OperationOutput,
  OutputEntry,
  PageOutput,
  WebhookOutput,
} from '@/utils/pages/builder';
import path from 'node:path';
import type { ClientApiPageProps } from '@/ui/create-client';
import { toStaticData } from '@/utils/pages/to-static-data';

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

interface OpenAPIPageData extends PageData {
  getAPIPageProps: () => ApiPageProps;
  getSchema: () => { id: string } & ProcessedDocument;
  getClientAPIPageProps: () => Promise<ClientApiPageProps>;
  structuredData: StructuredData;
  toc: TOCItemType[];
}

interface MetaOptions {
  folderStyle?: 'folder' | 'separator';
}

/**
 * Generate virtual pages for Fumadocs Source API
 */
export async function openapiSource(
  server: OpenAPIServer,
  options: SchemaToPagesOptions & {
    baseDir?: string;
    /** Generate `meta.json` files */
    meta?: boolean | MetaOptions;
  } = {},
): Promise<
  Source<{
    metaData: MetaData;
    pageData: OpenAPIPageData;
  }>
> {
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
      const props = getProps(entry);

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

  return {
    files,
  };
}

function getProps(entry: PageOutput | OperationOutput | WebhookOutput): ApiPageProps {
  if (entry.type === 'operation')
    return {
      document: entry.schemaId,
      operations: [entry.item],
      showDescription: true,
    };
  if (entry.type === 'webhook')
    return {
      document: entry.schemaId,
      webhooks: [entry.item],
      showDescription: true,
    };

  return {
    showTitle: true,
    showDescription: true,
    document: entry.schemaId,
    operations: entry.operations,
    webhooks: entry.webhooks,
  };
}

/**
 * @deprecated use `openapiPlugin()`
 */
export function transformerOpenAPI(): PageTreeTransformer {
  return openapiPlugin().transformPageTree!;
}
