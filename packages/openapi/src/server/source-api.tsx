import { MethodLabel } from '@/ui/components/method-label';
import type * as PageTree from 'fumadocs-core/page-tree';
import type {
  LoaderPlugin,
  PageData,
  PageFile,
  PageTreeTransformer,
  Source,
  SourceConfig,
} from 'fumadocs-core/source';
import type { OpenAPIServer } from '@/server/create';
import {
  type OutputEntry,
  type SchemaToPagesOptions,
  serverToPages,
} from '@/utils/schema-to-pages';

export type OpenAPIPluginOptions<Page extends PageData = PageData> =
  SchemaToPagesOptions & {
    from: OpenAPIServer;
    baseDir?: string;

    onPage: (raw: OutputEntry) => Page;
  };

export function openapiPlugin(): LoaderPlugin;

export function openapiPlugin<S extends SourceConfig | Source<SourceConfig>>(
  options?: OpenAPIPluginOptions<
    S extends Source<infer Config>
      ? Config['pageData']
      : S extends SourceConfig
        ? S['pageData']
        : never
  >,
): Promise<LoaderPlugin>;

/**
 * Fumadocs Source API integration, pass this to `plugins` array in `loader()`.
 */
export function openapiPlugin(
  autoPages?: OpenAPIPluginOptions,
): LoaderPlugin | Promise<LoaderPlugin> {
  const basePlugin: LoaderPlugin = {
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
      },
    },
  };

  if (autoPages) {
    const { from, onPage, baseDir = '' } = autoPages;

    return serverToPages(from, autoPages).then((entries) => {
      const pages = Object.values(entries).flat();

      basePlugin.transformStorage = ({ storage }) => {
        for (const page of pages) {
          storage.write(`${baseDir}/${page.path}`, {
            format: 'page',
            data: onPage(page),
            path: page.path,
            absolutePath: '',
            slugs: undefined as unknown as string[],
          });
        }
      };

      return basePlugin;
    });
  }

  return basePlugin;
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
