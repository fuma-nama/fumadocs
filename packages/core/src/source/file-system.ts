import type { FileInfo, MetaData, PageData } from './types';
import { parseFilePath, parseFolderPath, splitPath } from './path';

export interface Meta<Data extends MetaData = MetaData> {
  type: 'meta';
  file: FileInfo;
  data: Data;
}

export interface Page<Data extends PageData = PageData> {
  type: 'page';
  file: FileInfo;
  slugs: string[];
  url: string;
  data: Data;
}

export interface Folder<
  MD extends MetaData = MetaData,
  PD extends PageData = PageData,
> {
  type: 'folder';
  file: FileInfo;
  children: Node<MD, PD>[];
}

export type Node<
  MD extends MetaData = MetaData,
  PD extends PageData = PageData,
> = Meta<MD> | Page<PD> | Folder;

/**
 * A virtual file system that solves inconsistent behaviours
 *
 * Some source providers may not provide the full file structure, this will cause inconsistent outputs for page builder and other transformers
 */
export class Storage {
  files = new Map<string, Page | Meta>();
  folders = new Map<string, Folder>();
  private rootFolder: Folder = {
    type: 'folder',
    file: parseFolderPath(''),
    children: [],
  };

  constructor() {
    this.folders.set('', this.rootFolder);
  }

  /**
   * Read a file, it doesn't need an extension
   * @param path - flattened path
   */
  read(path: string): Page | Meta | undefined {
    return this.files.get(path);
  }

  readDir(path: string): Folder | undefined {
    return this.folders.get(path);
  }

  root(): Folder {
    return this.rootFolder;
  }

  write(path: string, file: Omit<Page, 'file'> | Omit<Meta, 'file'>): void {
    const node: Page | Meta = {
      file: parseFilePath(path),
      ...file,
    };

    this.makeDir(node.file.dirname);
    this.readDir(node.file.dirname)?.children.push(node);
    this.files.set(node.file.flattenedPath, node);
  }

  list(): (Page | Meta)[] {
    return [...this.files.values()];
  }

  makeDir(path: string): void {
    const segments = splitPath(path);

    for (let i = 0; i < segments.length; i++) {
      const segment = segments.slice(0, i + 1).join('/');
      if (this.folders.has(segment)) continue;

      const folder: Folder = {
        type: 'folder',
        file: parseFolderPath(segment),
        children: [],
      };

      this.folders.set(folder.file.path, folder);
      this.readDir(folder.file.dirname)?.children.push(folder);
    }
  }
}
