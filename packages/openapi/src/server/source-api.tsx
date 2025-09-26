import { MethodLabel } from '@/ui/components/method-label';
import type { PageTree } from 'fumadocs-core/server';
import type {
  LoaderPlugin,
  PageFile,
  PageTreeTransformer,
} from 'fumadocs-core/source';

/**
 * Fumadocs Source API integration, pass this to `plugins` array in `loader()`.
 */
export function openapiPlugin(): LoaderPlugin {
  return {
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
