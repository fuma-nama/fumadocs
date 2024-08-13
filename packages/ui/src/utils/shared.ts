import type { PageTree } from 'fumadocs-core/server';
import type { ReactNode } from 'react';

export const defaultImageSizes =
  '(max-width: 768px) 100vw, (max-width: 1200px) 70vw, 900px';

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
