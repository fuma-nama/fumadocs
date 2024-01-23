import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode } from 'react';

export const defaultImageSizes =
  '(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 800px';

export function isActive(
  url: string,
  pathname: string,
  nested = true,
): boolean {
  return url === pathname || (nested && pathname.startsWith(`${url}/`));
}

export function replaceOrDefault(
  obj:
    | {
        enabled?: boolean;
        component?: ReactNode;
      }
    | undefined,
  def: ReactNode,
): ReactNode {
  if (obj?.enabled === false) return;
  if (obj?.component !== undefined) return obj.component;

  return def;
}

export function hasActive(items: PageTree.Node[], url: string): boolean {
  return items.some((item) => {
    if (item.type === 'page') {
      return item.url === url;
    }

    if (item.type === 'folder')
      return item.index?.url === url || hasActive(item.children, url);

    return false;
  });
}

/**
 * Flatten tree to an array of page nodes
 */
export function flattenTree(tree: PageTree.Node[]): PageTree.Item[] {
  return tree.flatMap((node) => {
    if (node.type === 'separator') return [];
    if (node.type === 'folder') {
      const children = flattenTree(node.children);

      if (!node.root && node.index) return [node.index, ...children];
      return children;
    }

    return [node];
  });
}

export function mergeRefs<T>(
  ...refs: (React.MutableRefObject<T> | React.LegacyRef<T>)[]
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref !== null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}
