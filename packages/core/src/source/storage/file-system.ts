import { dirname } from '../path';

/**
 * In memory file system.
 */
export class FileSystem<File> {
  files = new Map<string, File>();
  folders = new Map<string, string[]>();
  /** paths of files copied from `inherit` and not written since */
  inherited = new Set<string>();

  constructor(inherit?: FileSystem<File>) {
    if (inherit) {
      for (const [k, v] of inherit.folders) {
        // copy: `write`/`makeDir` mutate these arrays, which must not leak into `inherit`
        this.folders.set(k, [...v]);
      }

      for (const [k, v] of inherit.files) {
        this.files.set(k, v);
        this.inherited.add(k);
      }
    } else {
      this.folders.set('', []);
    }
  }

  read(path: string): File | undefined {
    return this.files.get(path);
  }

  /**
   * get the direct children of folder (in virtual file path)
   */
  readDir(path: string): string[] | undefined {
    return this.folders.get(path);
  }

  write(path: string, file: File): void {
    if (!this.files.has(path)) {
      const dir = dirname(path);
      this.makeDir(dir);
      this.readDir(dir)?.push(path);
    }

    this.files.set(path, file);
    this.inherited.delete(path);
  }

  /**
   * Delete files at specified path.
   *
   * @param path - the target path.
   * @param [recursive=false] - if set to `true`, it will also delete directories.
   */
  delete(path: string, recursive = false): boolean {
    if (this.files.delete(path)) {
      this.inherited.delete(path);
      return true;
    }

    if (recursive) {
      const folder = this.folders.get(path);
      if (!folder) return false;

      this.folders.delete(path);
      for (const child of folder) {
        this.delete(child);
      }
      return true;
    }

    return false;
  }

  getFiles(): string[] {
    return Array.from(this.files.keys());
  }

  makeDir(path: string): void {
    const cur: string[] = [];
    let parentPath = '';

    for (const seg of path.split('/')) {
      cur.push(seg);
      const curPath = cur.join('/');

      if (!this.folders.has(curPath)) {
        this.folders.set(curPath, []);
        this.folders.get(parentPath)!.push(curPath);
      }

      parentPath = curPath;
    }
  }
}
