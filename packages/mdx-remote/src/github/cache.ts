import fs from 'node:fs';
import type { z } from 'zod';
import { unstable_cache as unstableCache } from 'next/cache';
import {
  createCompareTree,
  findTreeRecursive as findTreeRecursiveInner,
  createTransformTreeToCache,
  createApplyDiff,
  blobToUtf8,
  createRenderer,
} from './utils';
import { githubCacheFileSchema, parse } from './schema';
import type { getTree } from './get-tree';
import { getBlob } from './get-blob';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;

const findTreeRecursive = unstableCache(
  findTreeRecursiveInner,
  ['@fumadocs/mdx-remote/github/cache'],
  {
    tags: ['@fumadocs/mdx-remote/github/cache'],
  },
);

export interface CreateCacheOptions
  extends Pick<Parameters<typeof getTree>[0], 'owner' | 'repo' | 'token'> {
  directory: string;
  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  branch: string;
  githubApi?: Omit<
    Parameters<typeof getTree>[0],
    'owner' | 'repo' | 'token' | 'path' | 'treeSha'
  >;
}

export interface GithubCache {
  /**
   * The cache data.
   */
  data: GithubCacheFile;
  /**
   * File system utilities for the cache.
   * Mostly oriented for page tree generation.
   */
  fs: {
    readFile: (path: string) => Promise<string>;
    getFiles: () => Promise<string[]>;
  };
  /**
   * Applies a diff to the cache and returns the updated cache.
   */
  applyDiff: ReturnType<typeof createApplyDiff>;
  /**
   * Compares the cache to a tree and returns the differences. (predecessor to `applyDiff`)
   */
  compareToTree: ReturnType<typeof createCompareTree>;
  /**
   * This is mostly a utility that allows you to transform a tree to a cache. (useful for testing)
   */
  transformTreeToCache: ReturnType<typeof createTransformTreeToCache>;
  /**
   * Resolves all promises (content) in the cache and returns their resolved values.
   * This is useful for saving the cache to disk.
   */
  render: ReturnType<typeof createRenderer>;
  /**
   * Reads the cache from the disk or from the remote Git tree.
   */
  read: (cachePath: string) => Promise<GithubCacheFile | undefined>;
}

export const createCache = ({
  directory,
  githubApi,
  ...githubInfo
}: CreateCacheOptions): GithubCache => {
  let cache: GithubCacheFile | undefined;

  return {
    get data() {
      if (!cache)
        throw new Error('Cache not initialized - call cache.read() first');

      return cache;
    },
    set data(value: GithubCacheFile) {
      githubCacheFileSchema.parse(value);
      cache = value;
    },
    get compareToTree() {
      return createCompareTree(this.data);
    },
    get transformTreeToCache() {
      return createTransformTreeToCache(this.fs.readFile);
    },
    get fs() {
      return createCacheFileSystem();
    },
    get applyDiff() {
      return createApplyDiff(this.data, async (diff) =>
        blobToUtf8(
          await getBlob({
            ...githubInfo,
            ...githubApi,
            fileSha: diff.sha,
          }),
        ),
      );
    },
    get render() {
      return createRenderer(this.data);
    },
    async read(cachePath?: string) {
      if (cachePath && fs.existsSync(cachePath)) {
        cache = parse(
          githubCacheFileSchema,
          JSON.parse(fs.readFileSync(cachePath, 'utf-8')),
          `Invalid cache file at ${cachePath}`,
        );
      } else {
        const tree = await findTreeRecursive(directory, {
          ...githubInfo,
          ...githubApi,
          treeSha: githubInfo.branch,
        });

        if (!tree) return undefined;

        cache = this.transformTreeToCache(tree);
      }

      return cache;
    },
  };
};

interface CacheFileSystem {
  readFile: (path: string) => Promise<string>;
  getFiles: () => Promise<string[]>;
}

const createCacheFileSystem = (): CacheFileSystem => {
  return {
    async readFile(path) {
      return '';
    },
    async getFiles() {
      return [];
    },
  };
};
