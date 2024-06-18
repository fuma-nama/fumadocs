import path from 'node:path';
import fg from 'fast-glob';
import type { GithubCacheFile } from './cache';
import { getTree } from './get-tree';
import type { GitTreeItem } from './utils';

export const findTreeRecursive = async (
  directory: string,
  options: Parameters<typeof getTree>[0],
): Promise<Awaited<ReturnType<typeof getTree>> | undefined> => {
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

export const createTransformTreeToCache = (
  getFileContent?: (path: string) => string | Promise<string>,
) =>
  function transformTreeToCache(
    tree: Awaited<ReturnType<typeof getTree>>,
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
        segmentDirectory[segment] ||= {
          sha: item.sha,
          path: item.path,
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
          content: getFileContent?.(item.path) ?? '',
        });
        continue;
      }

      const parentDirectory = initParentDirectories(item, segments);

      parentDirectory.files.push({
        sha: item.sha,
        path: item.path,
        content: getFileContent?.(item.path) ?? '',
      });
    }

    return {
      lastUpdated,
      sha: tree.sha,
      files,
      subDirectories: Object.values(subDirectories).filter(
        Boolean,
      ) as GithubCacheFile['subDirectories'],
    };
  };

export const filesToGitTree = async ({
  include = './**/*.{json,md,mdx}',
  directory,
}: {
  include?: string | string[];
  directory: string;
}): ReturnType<typeof getTree> => {
  const fnv1a = (str: string): string => {
    const FNV_PRIME = 16777619;
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * FNV_PRIME) % 2 ** 32;
      hash = (hash + str.charCodeAt(i)) % 2 ** 32;
    }

    return hash.toString(16);
  };

  const files = await fg(include, {
    cwd: path.resolve(directory),
  });
  const tree: Awaited<ReturnType<typeof getTree>> = {
    sha: fnv1a(directory),
    url: path.basename(directory),
    truncated: false,
    tree: [],
  };

  const addToTree = (file: string): void => {
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
          sha: fnv1a(foundPath),
          url: path.join(path.basename(directory), foundPath),
        };
        current.push(found);
      }
    }

    current.push({
      path: file,
      type: 'blob',
      sha: fnv1a(file),
      url: path.join(path.basename(directory), file),
    });

    tree.tree = current;
  };

  for (const file of files) {
    addToTree(file);
  }

  return tree;
};
