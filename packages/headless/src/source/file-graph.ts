import type { FileInfo, MetaData, PageData } from './types';
import { parseFolderPath, splitPath } from './path';

export interface Meta {
  type: 'meta';
  file: FileInfo;
  data: MetaData;
}

export interface Page {
  type: 'page';
  file: FileInfo;
  slugs: string[];
  url: string;
  data: PageData;
}

export interface Folder {
  type: 'folder';
  file: FileInfo;
  children: Node[];
}

export type Node = Meta | Page | Folder;

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
  add: (file: Page | Meta) => void;
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
    root() {
      return root;
    },
    add(file) {
      this.makeDir(file.file.dirname);

      folders.get(file.file.dirname)?.children.push(file);
      files.set(file.file.flattenedPath, file);
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
