import { MethodLabel } from '@/ui/components/method-label';
import type { PageTree } from 'fumadocs-core/server';
import type { PageFile, PageTreeTransformer } from 'fumadocs-core/source';

/**
 * Source API Integration
 *
 * Add this to page tree builder options
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

export function transformerOpenAPI(): PageTreeTransformer {
  return {
    file(node, file) {
      if (!file) return node;
      const content = this.storage.read(file);

      return attachFile(node, content?.format === 'page' ? content : undefined);
    },
  };
}
