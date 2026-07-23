/**
 * The base path (Vite)
 */
export const BASE_PATH: string =
  typeof import.meta.env !== 'undefined' && typeof import.meta.env.BASE_URL === 'string'
    ? import.meta.env.BASE_URL
    : '/';

export function join(...paths: string[]) {
  let out = '';
  for (let p of paths) {
    if (out.length > 0) {
      if (p.startsWith('/')) p = p.slice(1);
      if (!out.endsWith('/')) out += '/';
    }
    out += p;
  }
  return out;
}

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
