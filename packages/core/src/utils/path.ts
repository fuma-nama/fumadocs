/**
 * Split path into segments, trailing/leading slashes are removed
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((p) => p.length > 0);
}

/**
 * Resolve paths, slashes within the path will be ignored
 * @param from - Path to resolve from
 * @param join - Paths to resolve
 * @example
 * ```
 * ['a','b'] // 'a/b'
 * ['/a'] // 'a'
 * ['a', '/b'] // 'a/b'
 * ['a', '../b/c'] // 'b/c'
 * ```
 */
export function joinPath(from: string, join: string): string {
  const v1 = splitPath(from),
    v2 = splitPath(join);

  while (v2.length > 0) {
    switch (v2[0]) {
      case '..':
        v1.pop();
        break;
      case '.':
        break;
      default:
        v1.push(v2[0]);
    }

    v2.shift();
  }

  return v1.join('/');
}

export function slash(path: string): string {
  const isExtendedLengthPath = path.startsWith('\\\\?\\');

  if (isExtendedLengthPath) {
    return path;
  }

  return path.replaceAll('\\', '/');
}
