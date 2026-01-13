import type * as PageTree from '@/page-tree';
import { visit } from '@/page-tree/utils';
import { useMemo } from 'react';

export interface SerializedPageTree {
  $fumadocs_loader: 'page-tree';
  data: object;
}

function deserializeHTML(html: string) {
  return (
    <span
      dangerouslySetInnerHTML={{
        __html: html,
      }}
    />
  );
}

export function deserializePageTree(serialized: SerializedPageTree): PageTree.Root {
  const root = serialized.data as PageTree.Root;
  visit(root, (item) => {
    if ('icon' in item && typeof item.icon === 'string') {
      item.icon = deserializeHTML(item.icon);
    }
    if (typeof item.name === 'string') {
      item.name = deserializeHTML(item.name);
    }
  });

  return root;
}

/**
 * Deserialize loader data that is serialized by the server-side Fumadocs `loader()`, supported:
 * - Page Tree
 *
 * other unrelated properties are kept in the output.
 */
export function useFumadocsLoader<V>(serialized: V): {
  [K in keyof V]: V[K] extends SerializedPageTree ? PageTree.Root : V[K];
} {
  return useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const k in serialized) {
      const v: unknown = serialized[k];
      if (
        typeof v === 'object' &&
        v !== null &&
        '$fumadocs_loader' in v &&
        v.$fumadocs_loader === 'page-tree' &&
        'data' in v &&
        typeof v.data === 'object'
      ) {
        out[k] = deserializePageTree(v as SerializedPageTree);
      } else {
        out[k] = v;
      }
    }

    return out as {
      [K in keyof V]: V[K] extends SerializedPageTree ? PageTree.Root : V[K];
    };
  }, [serialized]);
}
