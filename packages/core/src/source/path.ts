export function basename(path: string, ext?: string): string {
  const idx = path.lastIndexOf('/');

  return path.substring(
    idx === -1 ? 0 : idx + 1,
    ext ? path.length - ext.length : path.length,
  );
}

export function extname(path: string): string {
  const dotIdx = path.lastIndexOf('.');

  if (dotIdx !== -1) {
    return path.substring(dotIdx);
  }

  return '';
}

export function dirname(path: string): string {
  return path.split('/').slice(0, -1).join('/');
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
  const parsed = paths.flatMap(splitPath);

  for (const seg of parsed) {
    switch (seg) {
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
