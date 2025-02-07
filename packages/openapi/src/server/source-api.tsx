import type { BuildPageTreeOptions } from 'fumadocs-core/source';
import { MethodLabel } from '@/ui/components/method-label';

/**
 * Source API Integration
 *
 * Add this to page tree builder options
 */
export const attachFile: BuildPageTreeOptions['attachFile'] = (node, file) => {
  if (!file) return node;
  const data = file.data.data as object;
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
