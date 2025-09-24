/**
 * normalize URL into the Fumadocs standard form (`/slug-1/slug-2`).
 *
 * This includes URLs with trailing slashes.
 */
export function normalizeUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  if (!url.startsWith('/')) url = '/' + url;
  if (url.length > 1 && url.endsWith('/')) url = url.slice(0, -1);
  return url;
}
