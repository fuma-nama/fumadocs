import { MethodLabel } from '@/ui/components/method-label';
import type * as PageTree from 'fumadocs-core/page-tree';
import type {
  LoaderPlugin,
  PageFile,
  PageTreeTransformer,
  ResolvedLoaderConfig,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import type { SchemaToPagesOptions } from '@/utils/schema-to-pages';

export type WithPagesOptions = SchemaToPagesOptions & {
  from: OpenAPIServer;
  baseDir?: string;
};

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

/**
 * Generate virtual pages
 */
openapiPlugin.withPages = async (
  options: WithPagesOptions,
): Promise<LoaderPlugin> => {
  const { from, baseDir = '' } = options;

  const { serverToPages } = await import('@/utils/schema-to-pages');
  const { toBody } = await import('@/utils/pages/to-body');
  const entries = await serverToPages(from, options);
  const plugin = openapiPlugin();
  let loaderConfig: ResolvedLoaderConfig;
  plugin.config = (loaded) => {
    loaderConfig = loaded;
  };

  plugin.transformStorage = ({ storage }) => {
    if (!loaderConfig.source.fromVirtualPage) {
      throw new Error(
        '[Fumadocs OpenAPI] To generate virtual pages, `fromVirtualPage` must be implemented on your content source.',
      );
    }

    for (const page of Object.values(entries).flat()) {
      const path = `${baseDir}/${page.path}`;

      storage.write(path, {
        format: 'page',
        data: loaderConfig.source.fromVirtualPage({
          path,
          data: {
            ...page.info,
            _openapi: {
              method:
                page.type === 'operation' || page.type === 'webhook'
                  ? page.item.method
                  : undefined,
            },
          },
          body: toBody(from, page),
        }),
        path: page.path,
        absolutePath: '',
        slugs: undefined as unknown as string[],
      });
    }
  };

  return plugin;
};

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
