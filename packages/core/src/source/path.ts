export interface FileInfo {
  /**
   * File path without extension
   *
   * @deprecated obtain it with `join(dirname, name)`
   */
  flattenedPath: string;

  /**
   * path of file (unparsed)
   */
  path: string;

  /**
   * File name without extension
   */
  name: string;

  /**
   * file extension from the last `.`, like `.md`
   *
   * empty string if no file extension
   */
  ext: string;

  dirname: string;
}

export interface FolderInfo {
  /**
   * Original path of folder
   */
  path: string;

  /**
   * folder name
   */
  name: string;

  dirname: string;
}

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

export function parseFilePath(path: string): FileInfo {
  const ext = extname(path);
  const name = basename(path, ext);
  const dir = dirname(path);

  return {
    dirname: dir,
    name,
    ext,
    path,
    get flattenedPath() {
      return [dir, name].filter((p) => p.length > 0).join('/');
    },
  };
}

/**
 * @deprecated use `dirname` and `basename` directly.
 */
export function parseFolderPath(path: string): FolderInfo {
  return {
    dirname: dirname(path),
    name: basename(path),
    path,
  };
}
