export function basename(path: string, ext?: string): string {
  const idx = path.lastIndexOf('/');

  return path.substring(idx === -1 ? 0 : idx + 1, ext ? path.length - ext.length : path.length);
}

export function extname(path: string): string {
  for (let i = path.length - 1; i >= 0; i--) {
    const c = path[i];
    if (c === '.') return path.substring(i);
    if (c === '/') return '';
  }

  return '';
}

export function dirname(path: string): string {
  const idx = path.lastIndexOf('/');
  if (idx === -1) return '';

  return path.substring(0, idx);
}
/**
 * Split path into segments, trailing/leading slashes are removed
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => p.length > 0);
}

/**
 * Resolve paths, slashes within the path will be ignored
 * @param paths - Paths to join
 * @example
 * ```
 * ['a','b'] // 'a/b'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', '../b/c'] // 'b/c'
 * ```
 */
export function joinPath(...paths: string[]): string {
  const out = [];
  const parsed = paths.flatMap((path) => path.split('/'));

  for (const seg of parsed) {
    switch (seg) {
      case '':
        break;
      case '..':
        out.pop();
        break;
      case '.':
        break;
      default:
        out.push(seg);
    }
  }

  return out.join('/');
}

export function slash(path: string): string {
  const isExtendedLengthPath = path.startsWith('\\\\?\\');

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replaceAll('\\', '/');
}
