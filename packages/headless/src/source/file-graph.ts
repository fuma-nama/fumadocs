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
 * File Graph is a virtual file system
 *
 * Some source providers may not provide the full file structure, this will cause inconsistent outputs for page builder and other transformers
 *
 * A virtual file system can solve this problem
 */
export interface Storage {
  /**
   * Read a file, notice that it doesn't need an extension
   * @param path - flattened path
   */
  read: (path: string) => Page | Meta | undefined;
  readDir: (path: string) => Folder | undefined;
  root: () => Folder;
  write: (path: string, file: Omit<Page, 'file'> | Omit<Meta, 'file'>) => void;
  list: () => (Page | Meta)[];
  makeDir: (path: string) => void;
}

export function makeGraph(): Storage {
  const files = new Map<string, Page | Meta>();
  const folders = new Map<string, Folder>();
  const root: Folder = {
    type: 'folder',
    file: parseFolderPath(''),
    children: [],
  };

  folders.set('', root);

  return {
    list() {
      return [...files.values()];
    },
    root() {
      return root;
    },
    write(path, file) {
      const node: Page | Meta = {
        file: parseFilePath(path),
        ...file,
      };
      this.makeDir(node.file.dirname);

      folders.get(node.file.dirname)?.children.push(node);
      files.set(node.file.flattenedPath, node);
    },
    read(path) {
      return files.get(path);
    },
    readDir(path) {
      return folders.get(path);
    },
    makeDir(path) {
      const segments = splitPath(path);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments.slice(0, i + 1).join('/');
        if (folders.has(segment)) continue;

        const folder: Folder = {
          type: 'folder',
          file: parseFolderPath(segment),
          children: [],
        };

        folders.set(folder.file.path, folder);
        folders.get(folder.file.dirname)?.children.push(folder);
      }
    },
  };
}
