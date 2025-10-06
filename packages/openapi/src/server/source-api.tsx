import { MethodLabel } from '@/ui/components/method-label';
import type * as PageTree from 'fumadocs-core/page-tree';
import {
  LoaderPlugin,
  MetaData,
  PageData,
  PageFile,
  PageTreeTransformer,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import type { SchemaToPagesOptions } from '@/utils/schema-to-pages';
import { ApiPageProps } from '@/render/api-page';

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
  const { serverToPages } = await import('@/utils/schema-to-pages');
  const { toBody } = await import('@/utils/pages/to-body');
  const files: VirtualFile<{
    pageData: OpenAPIPageData;
    metaData: MetaData;
  }>[] = [];

  const entries = await serverToPages(from, options);
  for (const entry of Object.values(entries).flat()) {
    files.push({
      type: 'page',
      path: `${baseDir}/${entry.path}`,
      data: {
        ...entry.info,
        getAPIPageProps: () => toBody(from, entry),
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
 * Source API Integration, add this to page tree builder options.
 *
 * @deprecated use `openapiPlugin()`
 */
export const attachFile = (
  node: PageTree.Item,
  file: PageFile | undefined,
): PageTree.Item => {
  if (!file) return node;
  let data = file.data as object;
  // backward compatible with older versions with `_openapi` is located in `data.data`
  if ('data' in data && data.data && typeof data === 'object') data = data.data;

  let method: string | undefined;

  if ('_openapi' in data && typeof data._openapi === 'object') {
    const meta = data._openapi as {
      method?: string;
    };

    method = meta.method;
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
};

/**
 * @deprecated use `openapiPlugin()`
 */
export function transformerOpenAPI(): PageTreeTransformer {
  return openapiPlugin().transformPageTree!;
}
