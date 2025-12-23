import { MethodLabel } from '@/ui/components/method-label';
import type {
  LoaderPlugin,
  PageData,
  PageTreeTransformer,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import type { ApiPageProps } from '@/ui/api-page';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ProcessedDocument } from '@/utils/process-document';

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
  structuredData: StructuredData;
  toc: TOCItemType[];
}

/**
 * Generate virtual pages for Fumadocs Source API
 */
export async function openapiSource(
  server: OpenAPIServer,
  options: SchemaToPagesOptions & {
    baseDir?: string;
  } = {},
): Promise<
  Source<{
    metaData: never;
    pageData: OpenAPIPageData;
  }>
> {
  const { baseDir = '' } = options;
  const { createAutoPreset } = await import('@/utils/pages/preset-auto');
  const { fromServer } = await import('@/utils/pages/builder');
  const { toBody } = await import('@/utils/pages/to-body');
  const { toStaticData } = await import('@/utils/pages/to-static-data');
  const files: VirtualFile<{
    pageData: OpenAPIPageData;
    metaData: never;
  }>[] = [];

  const entries = await fromServer(server, createAutoPreset(options));
  for (const [schemaId, list] of Object.entries(entries)) {
    const processed = await server.getSchema(schemaId);
    for (const entry of list) {
      const props = toBody(entry);
      props.showDescription ??= true;

      files.push({
        type: 'page',
        path: `${baseDir}/${entry.path}`,
        data: {
          ...entry.info,
          getAPIPageProps() {
            return props;
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
  }

  return {
    files,
  };
}

/**
 * @deprecated use `openapiPlugin()`
 */
export function transformerOpenAPI(): PageTreeTransformer {
  return openapiPlugin().transformPageTree!;
}
