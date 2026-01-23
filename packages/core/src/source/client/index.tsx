import type * as PageTree from '@/page-tree';
import { visit } from '@/page-tree/utils';
import { useMemo } from 'react';

export interface SerializedPageTree {
  $fumadocs_loader: 'page-tree';
  data: object;
}

export type Serialized<Data> = {
  [K in keyof Data]: Data[K] extends SerializedPageTree ? PageTree.Root : Data[K];
};

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
export function useFumadocsLoader<V>(serialized: V): Serialized<V> {
  return useMemo(() => {
    const out: Record<string, unknown> = {};
    for (const k in serialized) {
      const v = serialized[k];
      if (isSerializedPageTree(v)) {
        out[k] = deserializePageTree(v);
      } else {
        out[k] = v;
      }
    }
    return out as Serialized<V>;
  }, [serialized]);
}

function isSerializedPageTree(v: unknown): v is SerializedPageTree {
  return (
    typeof v === 'object' &&
    v !== null &&
    '$fumadocs_loader' in v &&
    v.$fumadocs_loader === 'page-tree'
  );
}
