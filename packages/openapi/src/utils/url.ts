import type { RequestData } from '@/requests/types';

export function isUrl(schemaId: string): boolean {
  return schemaId.startsWith('https://') || schemaId.startsWith('http://');
}

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
  // First, resolve path parameters in the pathname
  for (const key in path) {
    const param = path[key];

    if (Array.isArray(param.value)) {
      pathname = pathname.replace(`{${key}}`, param.value.join('/'));
    } else {
      pathname = pathname.replace(`{${key}}`, param.value);
    }
  }

  // Check if pathname already contains query parameters (legacy API support)
  const [pathPart, existingQueryString] = pathname.split('?', 2);

  // Parse existing query parameters from the pathname if they exist
  const searchParams = new URLSearchParams(existingQueryString || '');

  // Add new query parameters from the RequestData
  for (const key in query) {
    const param = query[key];

    if (Array.isArray(param.value)) {
      // Remove existing parameter first to avoid duplicates
      searchParams.delete(key);
      for (const item of param.value) {
        searchParams.append(key, item);
      }
    } else {
      // Set (replace if exists) the parameter value
      searchParams.set(key, param.value);
    }
  }

  // Return the reconstructed URL
  return searchParams.size > 0 ? `${pathPart}?${searchParams}` : pathPart;
}
