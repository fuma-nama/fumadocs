import * as nodeFs from 'node:fs/promises';
import path from 'node:path';
import type { getTree, GetTreeResponse } from './get-tree';
import { getBlob } from './get-blob';
import { blobToUtf8, fnv1a, type GetFileContent } from './utils';
import { githubCacheStore } from './store';
import type {
  BaseCreateCacheOptions,
  CreateCacheLocalOptions,
  CreateCacheRemoteOptions,
  GithubCache,
  GlobalCache,
} from './types';
import {
  createDiff,
  findTreeRecursive,
  createFileSystem,
  createCreateGithubWebhookAPI,
  filesToGitTree,
  createCacheLoader,
  resolveAllContent,
  transformGitTreeToCache,
  loadInitialFiles,
  type CacheLoaderOptions,
} from './create';

export const createRemoteCache = ({
  cwd = process.cwd(),
  revalidateTag = 'nd-github',
  ...options
}: CreateCacheRemoteOptions): GithubCache => {
  const {
    directory,
    githubApi,
    saveFile = true,
    ...githubInfo
  } = options;


  const getFileContent: GetFileContent<{ sha: string }> = async (file) => {
    return blobToUtf8(
      await getBlob({
        ...githubInfo,
        ...githubApi,
        fileSha: file.sha,
      }),
    );
  };

  const base = createCacheBase({
    getFileContent,
    saveFile: saveFile ? path.resolve(cwd, '.next', 'fumadocs-github-cache.json') : false,
    options,
    cacheLoader: {
      notFound: async () => {
        const tree = await findTreeRecursive(directory ?? '', {
          ...githubInfo,
          ...githubApi,
          treeSha: githubInfo.branch,
        });

        if (!tree) return;

        return {
          tree,
          resolvedFile: transformGitTreeToCache(tree, getFileContent),
        };
      },
    },
  });

  return {
    ...base,
    get createGithubWebhookAPI() {
      return createCreateGithubWebhookAPI({
        cache: this,
        baseUrl: options.baseUrl ?? '/docs',
        ref: options.branch,
        directory: options.directory ?? '',
        githubOptions: {
          ...githubInfo,
          ...githubApi,
        },
        githubCacheStore,
        revalidationTag: revalidateTag,
      });
    },
  };
};

export const createLocalCache = (
  options: CreateCacheLocalOptions,
): GlobalCache => {
  const {
    directory,
    include = './**/*.{json,md,mdx}',
    saveFile = true,
  } = options;

  const getFileContent: GetFileContent<{ path: string }> = async (file) => {
    return nodeFs.readFile(path.resolve(directory, file.path), 'utf8');
  };

  const cachePath = path.resolve(directory, '.fumadocs', 'cache.json');

  return createCacheBase({
    saveFile: saveFile ? cachePath : false,
    options,
    getFileContent,
    cacheLoader: {
      notFound: async (lazy) => {
        let tree: Awaited<ReturnType<typeof getTree>>;

        if (lazy) {
          tree = {
            sha: '__FUMADOCS_GITHUB_CACHE_SHA__',
            url: '__FUMADOCS_GITHUB_CACHE_URL__',
            tree: [],
            truncated: false,
          };
        } else {
          tree = await filesToGitTree({
            include,
            ignore: saveFile ? [cachePath] : [],
            directory,
            hasher: async (file) => {
              const { mtimeMs: lastModified } = await nodeFs.stat(
                path.resolve(directory, file),
              );
              return fnv1a(`${file}_${String(lastModified)}`);
            },
          });
        }

        return {
          tree,
          resolvedFile: transformGitTreeToCache(tree, getFileContent),
        };
      },
    },
  });
};

/**
 * Create cache object for handling cache
 *
 * It starts loading the cache only when needed
 */
export function createCacheBase({
  getFileContent,
  cacheLoader: cacheLoaderOptions,
  saveFile,
  options,
}: {
  getFileContent: GetFileContent;
  saveFile: string | false;
  cacheLoader: Pick<CacheLoaderOptions, 'notFound'>;
  options: BaseCreateCacheOptions;
}): GlobalCache {
  const fs = createFileSystem();
  const loader = createCacheLoader({
    saveFile,
    fs,
    getFileContent,
    ...cacheLoaderOptions,
  });

  const load = loader.load().then((res) => {
    loadInitialFiles(fs, res.resolvedFile, getFileContent);

    return res;
  });

  let tree: Promise<GetTreeResponse> = load.then((res) => res.tree);

  return {
    async getData() {
      return load.then((res) => res.resolvedFile);
    },
    async getTree() {
      return tree;
    },
    diff: createDiff(fs, getFileContent),
    async load() {
      return load;
    },
    async resolveAllContent() {
      return resolveAllContent(await this.getData(), fs);
    },
    getFileSystem() {
      return fs;
    },
    updateTree(update) {
      tree = Promise.resolve(update);
    },
    _options: {
      include: options.include ?? './**/*.{json,md,mdx}',
    },
  };
}
