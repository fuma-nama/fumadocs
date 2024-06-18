import type { GithubCacheFile } from './cache';

export const createPopulateFileSystem = (
  cache: GithubCacheFile,
  _getFileContent?: (file: {
    sha: string;
    path: string;
  }) => string | Promise<string>,
) =>
  function populateFileSystem(getFileContent = _getFileContent) {
    const map = new Map<string, string | Promise<string>>();

    const addFiles = (files: GithubCacheFile['files']): void => {
      for (const file of files) {
        const content = getFileContent?.({
          path: file.path,
          sha: file.sha,
        });
        if (content) map.set(file.path, content);
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

    addFiles(cache.files);
    for (const subDirectory of cache.subDirectories) {
      addSubDirectory(subDirectory);
    }

    return map;
  };

export interface CacheVirtualFileSystem {
  readFile: (path: string) => Promise<string | undefined>;
  getFiles: () => string[];
  writeFile: (path: string, content: string | Promise<string>) => void;
}

export const createVirtualFileSystem = (
  extend?: Map<string, string | Promise<string>>,
): CacheVirtualFileSystem => {
  const files = new Map<string, string | Promise<string>>(extend);

  return {
    async readFile(file) {
      return files.get(file);
    },
    getFiles() {
      return Array.from(files.keys());
    },
    writeFile: files.set.bind(files),
  };
};
