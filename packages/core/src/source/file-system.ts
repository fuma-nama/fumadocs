import {
  parseFilePath,
  parseFolderPath,
  splitPath,
  type FileInfo,
} from './path';

export interface File {
  file: FileInfo;
  format: 'meta' | 'page';
  data: Record<string, unknown>;
}

export interface Folder {
  file: FileInfo;
  children: (File | Folder)[];
}

/**
 * A virtual file system that solves inconsistent behaviours
 *
 * Some source providers may not provide the full file structure, this will cause inconsistent outputs for page builder and other transformers
 */
export class Storage {
  files = new Map<string, File>();
  folders = new Map<string, Folder>();
  private rootFolder: Folder = {
    file: parseFolderPath(''),
    children: [],
  };

  constructor() {
    this.folders.set('', this.rootFolder);
  }

  /**
   * @param path - flattened path
   * @param format - file format
   */
  read(path: string, format: string): File | undefined {
    return this.files.get(`${path}.${format}`);
  }

  readDir(path: string): Folder | undefined {
    return this.folders.get(path);
  }

  root(): Folder {
    return this.rootFolder;
  }

  write(
    path: string,
    format: 'meta' | 'page',
    data: Record<string, unknown>,
  ): void {
    const node: File = {
      format,
      file: parseFilePath(path),
      data,
    };

    this.makeDir(node.file.dirname);
    this.readDir(node.file.dirname)?.children.push(node);
    this.files.set(`${node.file.flattenedPath}.${node.format}`, node);
  }

  list(): File[] {
    return [...this.files.values()];
  }

  makeDir(path: string): void {
    const segments = splitPath(path);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments.slice(0, i + 1).join('/');
      if (this.folders.has(segment)) continue;

      const folder: Folder = {
        file: parseFolderPath(segment),
        children: [],
      };

      this.folders.set(folder.file.path, folder);
      this.readDir(folder.file.dirname)?.children.push(folder);
    }
  }
}
