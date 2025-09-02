import type { SidebarTab } from '@/utils/get-sidebar-tabs';

function normalize(url: string) {
  if (url.length > 1 && url.endsWith('/')) return url.slice(0, -1);
  return url;
}

export function isActive(
  url: string,
  pathname: string,
  nested = true,
): boolean {
  url = normalize(url);
  pathname = normalize(pathname);

  return url === pathname || (nested && pathname.startsWith(`${url}/`));
}

export function isTabActive(tab: SidebarTab, pathname: string) {
  if (tab.urls) return tab.urls.has(normalize(pathname));

  return isActive(tab.url, pathname, true);
}
