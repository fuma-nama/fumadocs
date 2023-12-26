import { splitPath } from '@/server/utils';
import type { FileInfo, MetaData, PageData } from './types';
import { parseFolderPath } from './path';

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
  read: (path: string) => Node | undefined;
  root: () => Folder;
  add: (file: Page | Meta) => void;
  makeDir: (path: string) => void;
}

export function makeGraph(): Storage {
  const map = new Map<string, Page | Meta | Folder>();

  return {
    root: () => ({
      type: 'folder',
      file: parseFolderPath(''),
      children: [...map.values()].filter((node) => node.file.dirname === '.'),
    }),
    add(file) {
      this.makeDir(file.file.dirname);
      const dir = map.get(file.file.dirname) as Folder | undefined;

      dir?.children.push(file);
      map.set(file.file.path, file);
    },
    read(path) {
      return map.get(path);
    },
    makeDir(path) {
      const segments = splitPath(path);

      for (let i = 0; i < segments.length; i++) {
        const segment = segments.slice(0, i + 1).join('/');
        if (map.has(segment)) continue;

        const folder: Folder = {
          type: 'folder',
          file: parseFolderPath(segment),
          children: [],
        };

        map.set(segment, folder);

        const dir = map.get(folder.file.dirname);
        if (dir?.type === 'folder') dir.children.push(folder);
      }
    },
  };
}
