import type { GithubCache, GithubCacheFile } from './cache';
import type { getTree } from './get-tree';
import type { GetFileContent } from './utils';

export interface CompareTreeDiff {
  action: 'add' | 'remove' | 'modify';
  type: 'tree' | 'blob';
  sha: string;
  path: string;
}

export const createCompareToGitTree = (cacheFile: GithubCacheFile) =>
  function compareToGitTree(tree: Awaited<ReturnType<typeof getTree>>) {
    const diff: CompareTreeDiff[] = [];
    if (tree.sha === cacheFile.sha) return diff;

    const coveredPaths = new Set<string>();
    const compareFiles = createCompareFiles((file) => {
      coveredPaths.add(file.path);

      const matched = tree.tree.find((t) => t.path === file.path);
      let action: CompareTreeDiff['action'] | undefined;


      if (!matched) action = 'remove';
      else if (matched.sha !== file.sha) action = 'modify';
      else return;

      return {
        type: 'blob',
        action,
        path: file.path,
        sha: matched ? matched.sha : file.sha,
      };
    });

    for (const subDir of cacheFile.subDirectories) {
      coveredPaths.add(subDir.path);
      diff.push(...compareFiles(subDir.files));
    }

    diff.push(...compareFiles(cacheFile.files));

    const newItems = tree.tree.filter((t) => !coveredPaths.has(t.path));

    for (const item of newItems) {
      diff.push({
        type: item.type,
        action: 'add',
        path: item.path,
        sha: item.sha,
      });
    }

    return diff;
  };

const createCompareFiles = (
  compareFile: (
    file: GithubCacheFile['subDirectories'][0]['files'][0],
  ) => CompareTreeDiff | undefined,
) =>
  function compareFiles(files: GithubCacheFile['subDirectories'][0]['files']) {
    let diff: CompareTreeDiff[] = [];
    for (const file of files) {
      diff = diff.concat(compareFile(file) ?? []);
    }

    return diff;
  };

export const createApplyDiffToCache = (
  cacheFile: GithubCacheFile,
  fs: ReturnType<GithubCache['fs']>,
  _getFileContent: GetFileContent,
) =>
  function applyDiffToCache(
    diff: CompareTreeDiff[],
    getFileContent = _getFileContent,
  ) {
    for (const change of diff) {
      switch (change.action) {
        case 'add':
          if (change.type === 'blob') {
            const content = getFileContent(change);

            fs.writeFile(change.path, content);

            cacheFile.files.push({
              path: change.path,
              sha: change.sha,
              content,
            });
          } else {
            cacheFile.subDirectories.push({
              path: change.path,
              sha: change.sha,
              files: [],
              subDirectories: [],
            });
          }
          break;
        case 'modify':
          if (change.type === 'blob') {
            const fileIndex = cacheFile.files.findIndex(
              (f) => f.path === change.path,
            );
            if (fileIndex !== -1) {
              cacheFile.files[fileIndex].sha = change.sha;

              const content = getFileContent(change);

              fs.writeFile(change.path, content);
              cacheFile.files[fileIndex].content = content;
            }
          }
          break;
        case 'remove':
          if (change.type === 'blob') {
            cacheFile.files = cacheFile.files.filter(
              (f) => f.path !== change.path,
            );
          } else {
            cacheFile.subDirectories = cacheFile.subDirectories.filter(
              (sd) => sd.path !== change.path,
            );
          }
          break;
      }
    }

    return cacheFile;
  };
