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

  for (const path of paths) {
    for (const seg of path.split('/')) {
      switch (seg) {
        case '..':
          out.pop();
          break;
        case '':
        case '.':
          break;
        default:
          out.push(seg);
      }
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

/**
 * Convert (relative) file path to virtual file path.
 *
 * @param path - Relative path
 * @returns Normalized path, with no trailing/leading slashes
 * @throws Throws error if path starts with `./` or `../`
 */
export function normalize(path: string): string {
  const segments = path.split(/\/|\\/).filter((v) => v.length > 0);
  if (segments[0] === '.' || segments[0] === '..')
    throw new Error("It must not start with './' or '../'");
  return segments.join('/');
}
