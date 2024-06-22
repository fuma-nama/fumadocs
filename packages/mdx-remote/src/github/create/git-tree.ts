import path from 'node:path';
import fg from 'fast-glob';
import type { GithubCacheFile } from '../types';
import { getTree, type GetTreeResponse } from '../get-tree';
import { fnv1a, GetFileContent, type GitTreeItem } from '../utils';

export const findTreeRecursive = async (
  directory: string,
  options: Parameters<typeof getTree>[0],
): Promise<GetTreeResponse | undefined> => {
  const tree = await getTree(options);
  const segments = directory.split('/');

  if (segments.length === 0) {
    const matched = tree.tree.find(
      (t) => t.path === directory && t.type === 'tree',
    );
    if (!matched) return undefined;

    return getTree({
      ...options,
      treeSha: matched.sha,
    });
  }

  let currentTree = tree;

  for (const segment of segments) {
    const matched = currentTree.tree.find((t) => t.path === segment);

    if (matched?.type !== 'tree') return undefined;

    currentTree = await getTree({
      ...options,
      treeSha: matched.sha,
      recursive:
        segments.findLast((_, index, array) => index === array.length - 1) ===
        segment,
    });
  }

  return currentTree;
};

export function transformGitTreeToCache(
  tree: GetTreeResponse,
  // options
  getFileContent: GetFileContent,
  lastUpdated = Date.now(),
): GithubCacheFile {
  const files: GithubCacheFile['files'] = [];
  const subDirectories: Record<
    string,
    GithubCacheFile['subDirectories'][number] | undefined
  > = {};
  const blobs = tree.tree.filter((t) => t.type === 'blob');
  const trees = tree.tree.filter((t) => t.type === 'tree');

  const initParentDirectories = (
    item: GitTreeItem,
    segments: string[],
  ): GithubCacheFile['subDirectories'][0] => {
    let segmentDirectory: Record<string, NonNullable<unknown> | undefined> =
      subDirectories;

    for (const segment of segments.slice(0, -1)) {
      const index = segments.indexOf(segment);
      const gitTreeEntry = tree.tree.find(
        (entry) => entry.path === segments.slice(0, index + 1).join('/'),
      );

      // this segment can't be added if the tree doesn't exist
      if (!gitTreeEntry) break;

      segmentDirectory[segment] ||= {
        sha: gitTreeEntry.sha,
        path: gitTreeEntry.path,
        files: [],
        subDirectories: [],
      };
      segmentDirectory = segmentDirectory[segment] as Record<
        string,
        NonNullable<unknown> | undefined
      >;
    }

    return segmentDirectory as GithubCacheFile['subDirectories'][0];
  };

  for (const item of trees) {
    const segments = item.path.split('/');
    initParentDirectories(item, segments);
  }

  for (const item of blobs) {
    const segments = item.path.split('/');

    if (segments.length === 1) {
      files.push({
        sha: item.sha,
        path: item.path,
        content: getFileContent?.(item) ?? '',
      });
      continue;
    }

    const parentDirectory = initParentDirectories(item, segments);

    parentDirectory.files.push({
      sha: item.sha,
      path: item.path,
      content: getFileContent?.(item) ?? '',
    });
  }

  return {
    lastUpdated,
    sha: tree.sha,
    files,
    subDirectories: Object.entries(subDirectories)
      .map(([name, data]) => ({
        ...data,
        path: name,
      }))
      .filter(Boolean) as GithubCacheFile['subDirectories'],
  };
}

export const filesToGitTree = async ({
  include = './**/*.{json,md,mdx}',
  directory,
  hasher = fnv1a,
  ignore = [],
}: {
  ignore?: string[];
  include?: string | string[];
  directory: string;
  hasher?: (file: string) => string | Promise<string>;
}): ReturnType<typeof getTree> => {
  const files = await fg(include, {
    cwd: path.resolve(directory),
    ignore,
  });
  const tree: Awaited<ReturnType<typeof getTree>> = {
    sha: await hasher(path.resolve(directory)),
    url: path.basename(directory),
    truncated: false,
    tree: [],
  };

  for await (const file of files) {
    const normalizedPath = path.normalize(file);
    const segments = normalizedPath.split(path.sep);
    const current = tree.tree;

    for (const part of segments.slice(0, -1)) {
      const i = segments.indexOf(part);
      let found = current.find(
        (item) => item.path === segments.slice(0, i + 1).join('/'),
      );
      if (!found) {
        const foundPath = segments.slice(0, i + 1).join('/');
        found = {
          path: foundPath,
          type: 'tree',
          sha: await hasher(foundPath),
          url: path.join(path.basename(directory), foundPath),
        };
        current.push(found);
      }
    }

    current.push({
      path: file,
      type: 'blob',
      sha: await hasher(file),
      url: path.join(path.basename(directory), file),
    });

    tree.tree = current;
  }

  return tree;
};

export const cacheFileToGitTree = (
  cacheFile: GithubCacheFile,
): Awaited<ReturnType<typeof getTree>> => {
  const skeleton: Awaited<ReturnType<typeof getTree>> = {
    sha: cacheFile.sha,
    tree: [],
    url: '__FUMADOCS_GITHUB_CACHE_URL__',
    truncated: false,
  };

  const { files, subDirectories } = cacheFile;

  const addFile = (file: GithubCacheFile['files'][number]): number =>
    skeleton.tree.push({
      type: 'blob',
      sha: file.sha,
      path: file.path,
      url: '__FUMADOCS_GITHUB_CACHE_URL__',
    });

  const addDirectory = (
    directory: GithubCacheFile['subDirectories'][number],
  ): void => {
    skeleton.tree.push({
      type: 'tree',
      sha: directory.sha,
      path: directory.path,
      url: '__FUMADOCS_GITHUB_CACHE_URL__',
    });
    for (const file of directory.files) {
      addFile(file);
    }
    for (const subDirectory of directory.subDirectories) {
      addDirectory(subDirectory);
    }
  };

  for (const file of files) {
    addFile(file);
  }

  for (const directory of subDirectories) {
    addDirectory(directory);
  }

  return skeleton;
};
