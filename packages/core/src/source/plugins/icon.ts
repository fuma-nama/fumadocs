import type { LoaderPlugin } from '@/source';
import type { ReactNode } from 'react';
import type * as PageTree from '@/page-tree/definitions';

export type IconResolver = (icon: string | undefined) => ReactNode;

export function iconPlugin(resolveIcon: IconResolver): LoaderPlugin {
  function replaceIcon<T extends PageTree.Node>(node: T): T {
    if (node.icon === undefined || typeof node.icon === 'string')
      node.icon = resolveIcon(node.icon);

    return node;
  }

  return {
    name: 'fumadocs:icon',
    transformPageTree: {
      file: replaceIcon,
      folder: replaceIcon,
      separator: replaceIcon,
    },
  };
}
