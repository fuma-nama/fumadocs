import type { RequestData } from '@/requests/_shared';

export function joinURL(base: string, pathname: string): string {
  if (pathname.startsWith('/')) pathname = pathname.slice(1);
  if (base.endsWith('/')) base = base.slice(0, -1);

  if (pathname.length > 0) return base + '/' + pathname;
  else return base;
}

/**
 * @param url - URL (can be relative)
 * @param base - the base URL (must be absolute)
 */
export function withBase(url: string, base: string): string {
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    return joinURL(base, url);
  }

  return url;
}

export function resolveServerUrl(
  template: string,
  variables: Record<string, string>,
): string {
  for (const [key, value] of Object.entries(variables)) {
    template = template.replaceAll(`{${key}}`, value);
  }

  return template;
}

export function resolveRequestData(
  pathname: string,
  { path, query }: RequestData,
): string {
  for (const key in path) {
    if (path[key] === '') continue;

    if (Array.isArray(path[key])) {
      pathname = pathname.replace(`{${key}}`, path[key].join('/'));
    } else {
      pathname = pathname.replace(`{${key}}`, String(path[key]));
    }
  }

  const searchParams = new URLSearchParams();
  for (const key in query) {
    if (Array.isArray(query[key])) {
      for (const value of query[key]) {
        if (!query[key]) continue;

        searchParams.append(key, String(value));
      }
    } else if (query[key] && query[key] !== '') {
      searchParams.set(key, String(query[key]));
    }
  }

  return searchParams.size > 0 ? `${pathname}?${searchParams}` : pathname;
}
