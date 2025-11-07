import { MethodLabel } from '@/ui/components/method-label';
import type {
  LoaderPlugin,
  MetaData,
  PageData,
  PageTreeTransformer,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import type { ApiPageProps } from '@/ui/api-page';

declare module 'fumadocs-core/source' {
  export interface PageData {
    /**
     * Added by Fumadocs OpenAPI
     */
    _openapi?: {
      method?: string;
    };
  }
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

        const data = file.data;
        let method: string | undefined;

        if ('_openapi' in data && typeof data._openapi === 'object') {
          method = data._openapi.method;
        }

        if (method) {
          node.name = (
            <>
              {node.name}{' '}
              <MethodLabel className="ms-auto text-xs text-nowrap">
                {method}
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
}

/**
 * Generate virtual pages for Fumadocs Source API
 */
export async function openapiSource(
  from: OpenAPIServer,
  options: SchemaToPagesOptions & {
    baseDir?: string;
  } = {},
): Promise<
  Source<{
    metaData: MetaData;
    pageData: OpenAPIPageData;
  }>
> {
  const { baseDir = '' } = options;
  const { createAutoPreset } = await import('@/utils/pages/preset-auto');
  const { fromServer } = await import('@/utils/pages/builder');
  const { toBody } = await import('@/utils/pages/to-body');
  const files: VirtualFile<{
    pageData: OpenAPIPageData;
    metaData: MetaData;
  }>[] = [];

  const entries = await fromServer(from, createAutoPreset(options));
  for (const entry of Object.values(entries).flat()) {
    files.push({
      type: 'page',
      path: `${baseDir}/${entry.path}`,
      data: {
        ...entry.info,
        getAPIPageProps: () => toBody(entry),
        _openapi: {
          method:
            entry.type === 'operation' || entry.type === 'webhook'
              ? entry.item.method
              : undefined,
        },
      },
    });
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
