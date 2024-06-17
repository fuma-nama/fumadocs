import path from 'node:path';
import fg from 'fast-glob';
import type { GithubCacheFile } from './cache';
import { getTree } from './get-tree';

export interface CompareTreeDiff {
  type: 'tree' | 'blob';
  action: 'add' | 'remove' | 'modify';
  path: string;
}

export const findTreeRecursive = async (
  directory: string,
  options: Parameters<typeof getTree>[0],
): Promise<Awaited<ReturnType<typeof getTree>> | undefined> => {
  const tree = await getTree(options);
  const segments = directory.split('/');

  // depth = 0
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

  // we need to search deeper in the tree (another getTree call)

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

export const transformTreeToCache = (
  tree: Awaited<ReturnType<typeof getTree>>,
  lastUpdated = Date.now(),
): GithubCacheFile => {
  // tree = { sha, tree: [{ type, path, sha }] }
  // cache = { directory: { sha, path }, subDirectories: [{ path, sha, files: [{ path, sha }] }] }

  const files: GithubCacheFile['files'] = [];
  const subDirectories: Record<
    string,
    GithubCacheFile['subDirectories'][number] | undefined
  > = {};
  const blobs = tree.tree.filter((t) => t.type === 'blob');
  const trees = tree.tree.filter((t) => t.type === 'tree');

  for (const item of trees) {
    const segments = item.path.split('/');
    let segmentDirectory: Record<string, NonNullable<unknown> | undefined> =
      subDirectories;

    for (const segment of segments) {
      segmentDirectory[segment] ||= {
        sha: item.sha,
        path: item.path,
        files: [],
        subDirectories: [],
      };
      segmentDirectory = segmentDirectory[segment];
    }
  }

  for (const item of blobs) {
    const segments = item.path.split('/');

    if (segments.length === 1) {
      files.push({
        sha: item.sha,
        path: item.path,
        content: '',
      });
      continue;
    }

    let segmentDirectory: Record<string, NonNullable<unknown> | undefined> =
      subDirectories;

    for (const segment of segments.slice(0, -1)) {
      segmentDirectory[segment] ||= {
        sha: item.sha,
        path: item.path,
        files: [],
        subDirectories: [],
      };
      segmentDirectory = segmentDirectory[segment];
    }

    const realDirectory =
      segmentDirectory as GithubCacheFile['subDirectories'][0];

    realDirectory.files.push({
      sha: item.sha,
      path: item.path,
      content: '',
    });
  }

  // for (const item of tree.tree) {
  //   if (item.type === 'blob') {
  //     const pathParts = item.path.split('/');
  //     const fileName = pathParts.pop();
  //     const dirPath = pathParts.join('/');

  //     if (!subDirectories[dirPath]) {
  //       subDirectories[dirPath] = {
  //         path: dirPath,
  //         sha: '',
  //         files: [],
  //         subDirectories: [],
  //       };
  //     }

  //     subDirectories[dirPath].files.push({
  //       path: item.path,
  //       sha: item.sha,
  //       content: '' // TODO
  //     });
  //   } else {
  //     const pathParts = item.path.split('/');
  //     const dirName = pathParts.pop();
  //     const parentPath = pathParts.join('/');

  //   }
  // }

  // // Assign SHA to directories
  // for (const item of tree.tree) {
  //   const sub = subDirectories[item.path];
  //   if (item.type === 'tree' && sub) {
  //     sub.sha = item.sha;
  //   }
  // }

  // Convert the object back to array format expected by the schema
  // const subDirectoriesArray = Object.values(subDirectories).filter(Boolean) as GithubCacheFile['subDirectories'];

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
  include?: string;
  directory: string;
}): ReturnType<typeof getTree> => {
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
      url: path.join(path.basename(directory), file)
    });

    tree.tree = current;
  };

  for (const file of files) {
    addToTree(file);
  }

  return tree;
};

const fnv1a = (str: string): string => {
  const FNV_PRIME = 16777619;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * FNV_PRIME) % 2 ** 32;
    hash = (hash + str.charCodeAt(i)) % 2 ** 32;
  }

  return hash.toString(16);
};

export const createCompareTree = (cache: GithubCacheFile) =>
  function compareToTree(tree: Awaited<ReturnType<typeof getTree>>) {
    const diff: CompareTreeDiff[] = [];
    if (tree.sha === cache.sha) return diff;

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
      };
    });

    for (const subDir of cache.subDirectories) {
      coveredPaths.add(subDir.path);
      diff.push(...compareFiles(subDir.files));
    }

    diff.push(...compareFiles(cache.files));

    const newItems = tree.tree.filter(
      (t) => !coveredPaths.has(t.path),
    );

    for (const item of newItems) {
      diff.push({
        type: item.type,
        action: 'add',
        path: item.path,
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
