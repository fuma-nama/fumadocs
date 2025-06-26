import { dirname } from './path';
import { splitPath } from '@/utils/path';

/**
 * In memory file system.
 */
export class FileSystem<File> {
  files = new Map<string, File>();
  folders = new Map<string, string[]>();

  constructor() {
    this.folders.set('', []);
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
    const dir = dirname(path);

    this.makeDir(dir);
    this.readDir(dir)?.push(path);
    this.files.set(path, file);
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
