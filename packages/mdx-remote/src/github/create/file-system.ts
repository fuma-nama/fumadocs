import type { GithubCacheFile, GlobalCache } from '../types';
import type { GetFileContent } from '../utils';
import { GetTreeResponse } from '@/github/get-tree';
import { DiffUtils } from '@/github/create/diff';

export function loadInitialFiles(
  fs: VirtualFileSystem,
  cacheFile: GithubCacheFile,
  getFileContent: GetFileContent,
): void {
  const addFiles = (files: GithubCacheFile['files']): void => {
    for (const file of files) {
      let content = file.content;

      if (!content) {
        content = getFileContent?.({
          path: file.path,
          sha: file.sha,
        });
      } else if (typeof content === 'string') {
        content = Buffer.from(content, 'hex').toString('utf-8');
      }

      if (content) fs.writeFile(file.path, content);
    }
  };
  const addSubDirectory = (
    subDirectory: GithubCacheFile['subDirectories'][number],
  ): void => {
    addFiles(subDirectory.files);
    for (const subDir of subDirectory.subDirectories) {
      addSubDirectory(subDir);
    }
  };

  addFiles(cacheFile.files);
  for (const subDirectory of cacheFile.subDirectories) {
    addSubDirectory(subDirectory);
  }
}

export interface VirtualFileSystem {
  readFile: (path: string) => Promise<string | undefined>;
  getFiles: () => string[];
  writeFile: (path: string, content: string | Promise<string>) => void;
}

/**
 * Load a single file into the virtual file system
 * Usually used to load files individually during development
 */
export function loadFile(
  cacheFile: GithubCacheFile,
  fs: VirtualFileSystem,
  tree: GetTreeResponse,
  diff: DiffUtils,
  file: { path: string; sha: string },
  content: string | Promise<string>,
) {
  fs.writeFile(file.path, content);

  tree.tree.push({
    type: 'blob',
    path: file.path,
    sha: file.sha,
    url: '__FUMADOCS_GITHUB_CACHE_URL__',
  });
  const changes = diff.compareToGitTree(cacheFile, {
    ...tree,
    sha: `${tree.sha}1`,
  });
  diff.applyToCache(cacheFile, changes);
}

export function createFileSystem(): VirtualFileSystem {
  const files = new Map<string, string | Promise<string>>();

  return {
    async readFile(file) {
      return files.get(file);
    },
    getFiles() {
      return Array.from(files.keys());
    },
    writeFile: (path, content) => {
      files.set(path, content);
    },
  };
}
