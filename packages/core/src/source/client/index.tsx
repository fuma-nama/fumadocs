import type * as PageTree from '@/page-tree';
import { visit } from '@/page-tree/utils';
import { useMemo } from 'react';

export function deserializePageTree(root: PageTree.Root): PageTree.Root {
  function deserializeHTML(html: string) {
    return (
      <span
        dangerouslySetInnerHTML={{
          __html: html,
        }}
      />
    );
  }
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
 * Deserialize data passed from server-side loader.
 *
 * It only receives the serialized data from server-side, hence not sharing plugins and some properties.
 */
export function useFumadocsLoader<
  V extends {
    pageTree?: object;
  },
>(serialized: V) {
  const { pageTree } = serialized;

  return useMemo(() => {
    return {
      pageTree: pageTree ? deserializePageTree(pageTree as PageTree.Root) : undefined,
    } as {
      pageTree: V['pageTree'] extends object ? PageTree.Root : undefined;
    };
  }, [pageTree]);
}
