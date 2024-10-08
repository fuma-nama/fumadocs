import type { PageTree } from 'fumadocs-core/server';

export function isActive(
  url: string,
  pathname: string,
  nested = true,
): boolean {
  return url === pathname || (nested && pathname.startsWith(`${url}/`));
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
