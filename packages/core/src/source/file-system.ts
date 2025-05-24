import type { MetaData, PageData } from '@/source/types';
import {
  type FileInfo,
  type FolderInfo,
  parseFilePath,
  parseFolderPath,
} from './path';
import { joinPath, splitPath } from '@/utils/path';

export interface MetaFile<Data extends MetaData = MetaData> {
  file: FileInfo;
  format: 'meta';
  data: Data;
}

export interface PageFile<Data extends PageData = PageData> {
  file: FileInfo;
  format: 'page';
  data: {
    slugs: string[];
    data: Data;
  };
}

type File = MetaFile | PageFile;

export interface Folder<
  Page extends PageData = PageData,
  Meta extends MetaData = MetaData,
> {
  file: FolderInfo;
  children: (MetaFile<Meta> | PageFile<Page> | Folder<Page, Meta>)[];
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
  read<F extends File['format']>(
    path: string,
    format: F,
  ): Extract<File, { format: F }> | undefined {
    return this.files.get(`${path}.${format}`) as Extract<File, { format: F }>;
  }

  readDir(path: string): Folder | undefined {
    return this.folders.get(path);
  }

  root(): Folder {
    return this.rootFolder;
  }

  write<F extends File['format']>(
    path: string,
    format: F,
    data: Extract<File, { format: F }>['data'],
  ): void {
    const node = {
      format,
      file: parseFilePath(path),
      data,
    } as File;

    this.makeDir(node.file.dirname);
    this.readDir(node.file.dirname)?.children.push(node);
    this.files.set(
      joinPath(node.file.dirname, `${node.file.name}.${node.format}`),
      node,
    );
  }

  list(): File[] {
    return Array.from(this.files.values());
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
