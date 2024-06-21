import type { GithubCache } from '../types';
import type { GetFileContent } from '../utils';

export const createPopulateFileSystem = (
  cacheFile: GithubCache['data'],
  _getFileContent?: GetFileContent,
) =>
  function populateFileSystem(getFileContent = _getFileContent) {
    const map = new Map<string, string | Promise<string>>();

    const addFiles = (files: GithubCache['data']['files']): void => {
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

        if (content) map.set(file.path, content);
      }
    };
    const addSubDirectory = (
      subDirectory: GithubCache['data']['subDirectories'][number],
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

    return map;
  };

export interface VirtualFileSystem {
  readFile: (path: string) => Promise<string | undefined>;
  getFiles: () => string[];
  writeFile: (path: string, content: string | Promise<string>) => void;
  /**
   * Load a single file into the virtual file system
   * Usually used to load files individually during development
   */
  loadFile: <T extends { path: string; sha: string }>(
    file: T,
    content: string | Promise<string>,
  ) => void;
}

export const createVirtualFileSystem = (
  tree: GithubCache['tree'],
  diff: GithubCache['diff'],
  getFileContent: GetFileContent,
  extend?: Map<string, string | Promise<string>>,
): VirtualFileSystem => {
  const files = new Map<string, string | Promise<string>>(extend);

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
    loadFile: (file, content) => {
      files.set(file.path, content);
      tree.tree.push({
        type: 'blob',
        path: file.path,
        sha: file.sha,
        url: '__FUMADOCS_GITHUB_CACHE_URL__',
      });
      const changes = diff.compareToGitTree({
        ...tree,
        sha: `${tree.sha}1`,
      });
      diff.applyToCache(changes, getFileContent);
    },
  };
};

export const createFileSystem = (
  data: GithubCache['data'],
  tree: GithubCache['tree'],
  diff: GithubCache['diff'],
  getFileContent: GetFileContent,
) => {
  const populateFileSystem = createPopulateFileSystem(data);
  let virtualFileSystem: VirtualFileSystem | undefined;

  return function fileSystem(): VirtualFileSystem {
    if (!virtualFileSystem) {
      virtualFileSystem = createVirtualFileSystem(
        tree,
        diff,
        getFileContent,
        populateFileSystem(getFileContent),
      );
    }
    return virtualFileSystem;
  };
};
