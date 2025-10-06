import { dirname, splitPath } from '../path';

/**
 * In memory file system.
 */
export class FileSystem<File> {
  files = new Map<string, File>();
  folders = new Map<string, string[]>();

  constructor(inherit?: FileSystem<File>) {
    if (inherit) {
      for (const [k, v] of inherit.folders) {
        this.folders.set(k, v);
      }

      for (const [k, v] of inherit.files) {
        this.files.set(k, v);
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
  }

  /**
   * Delete files at specified path.
   *
   * @param path - the target path.
   * @param [recursive=false] - if set to `true`, it will also delete directories.
   */
  delete(path: string, recursive = false): boolean {
    if (this.files.delete(path)) return true;

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
    const segments = splitPath(path);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments.slice(0, i + 1).join('/');
      if (this.folders.has(segment)) continue;

      this.folders.set(segment, []);
      this.folders.get(dirname(segment))!.push(segment);
    }
  }
}
