import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import {
  createTransformTreeToCache,
  filesToGitTree,
  findTreeRecursive,
} from './git-tree';
import { githubCacheFileSchema, parse } from './schema';
import type { getTree } from './get-tree';
import { getBlob } from './get-blob';
import {
  createPopulateFileSystem,
  createVirtualFileSystem,
  type CacheVirtualFileSystem,
} from './file-system';
import { createApplyDiffToCache, createCompareToGitTree } from './diff';
import { createContentResolver } from './resolve-content';
import { blobToUtf8, fnv1a, type GetFileContent } from './utils';
import { createGeneratePageTree } from './page-tree';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;
export interface BaseCreateCacheOptions
  extends Pick<Parameters<typeof getTree>[0], 'owner' | 'repo' | 'token'> {
  directory: string;
  /**
   * Included files.
   *
   * Includes Markdown, MDX and json files by default
   */
  include?: string | string[];
  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  branch: string;
  githubApi?: Pick<Parameters<typeof getTree>[0], 'init' | 'recursive'>;
}

export interface GithubCache {
  /**
   * File system utilities for the cache.
   * Mostly oriented for page tree generation.
   */
  fs: ReturnType<typeof createFileSystem>;
  /**
   * Reads the cache from the disk, or interprets new cache from files (local or remoate)
   */
  load: ReturnType<typeof createrLoader>;
  /**
   * The cache data.
   */
  data: GithubCacheFile;
  /**
   * Resolves all content (content is stored as a promise) in the cache and returns their resolved values.
   * This is useful when preparing the cache to be saved to the disk.
   */
  resolveAllContent: ReturnType<typeof createContentResolver>;
  /**
   * Generates a page tree from the cache.
   */
  generatePageTree: ReturnType<typeof createGeneratePageTree>;
  /**
   * Functions relating to making changes the cache
   */
  diff: {
    /**
     * Applies a diff to the cache and returns the updated cache.
     */
    applyToCache: ReturnType<typeof createApplyDiffToCache>;
    /**
     * Compares the cache to a Git tree and returns the differences. (predecessor to `applyDiff`)
     */
    compareToGitTree: ReturnType<typeof createCompareToGitTree>;
  };
  /**
   * Get the tree used for analysis.
   */
  tree: NonNullable<Awaited<ReturnType<typeof findTreeRecursive>>> & {
    /**
     * This is mostly a utility that allows you to transform a tree to a cache. (useful for testing)
     */
    transformToCache: ReturnType<typeof createTransformTreeToCache>;
  };
}

type CreateCacheOptions<Env extends 'local' | 'remote'> = Env extends 'local'
  ? CreateCacheLocalOptions
  : CreateCacheRemoteOptions;
type CreateCacheRemoteOptions = BaseCreateCacheOptions;
type CreateCacheLocalOptions = Pick<
  BaseCreateCacheOptions,
  'directory' | 'include'
>;

export const createCache: (
  options: CreateCacheLocalOptions | CreateCacheRemoteOptions,
) => GithubCache = (options) =>
  // TODO: use zod to verify whether is remote or local
  'owner' in options ? createRemoteCache(options) : createLocalCache(options);

export const createRemoteCache = (
  options: CreateCacheOptions<'remote'>,
): GithubCache => {
  const { directory, githubApi, ...githubInfo } = options;

  const getFileContent: GetFileContent<{ sha: string }> = async (file) => {
    return blobToUtf8(
      await getBlob({
        ...githubInfo,
        ...githubApi,
        fileSha: file.sha,
      }),
    );
  };

  return enhancedCacheBoilerplate(options, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createrLoader({
        notFound: async () => {
          const tree = await findTreeRecursive(directory, {
            ...githubInfo,
            ...githubApi,
            treeSha: githubInfo.branch,
          });

          if (!tree) return;

          // @ts-expect-error We define tree.transformToCache right after this
          this.tree = tree;
          this.tree.transformToCache =
            createTransformTreeToCache(getFileContent);

          this.data = this.tree.transformToCache(tree);

          return this.data;
        },
        setData: (data) => {
          this.data = data;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
  } as GithubCache);
};

export const createLocalCache = (
  options: CreateCacheOptions<'local'>,
): GithubCache => {
  const { directory, include = './**/*.{json,md,mdx}' } = options;

  const getFileContent: GetFileContent<{ path: string }> = async (file) => {
    return fs.promises.readFile(path.resolve(directory, file.path), 'utf8');
  };

  return enhancedCacheBoilerplate(options, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createrLoader({
        notFound: async (lazy) => {
          let tree: Awaited<ReturnType<typeof getTree>>;

          if (lazy) {
            tree = {
              sha: '__FUMADOCS_GITHUB_CACHE_LAZY__',
              url: '__FUMADOCS_GITHUB_CACHE_LAZY__',
              tree: [],
              truncated: false,
            };
          } else {
            tree = await filesToGitTree({
              include,
              directory,
              hasher: async (file) => {
                const { mtimeMs: lastModified } = await fs.promises.stat(
                  path.resolve(directory, file),
                );
                return fnv1a(`${file}_${String(lastModified)}`);
              },
            });
          }

          this.tree = Object.assign(tree, {
            transformToCache: createTransformTreeToCache(getFileContent),
          });

          this.data = this.tree.transformToCache(this.tree);

          return this.data;
        },
        setData: (data) => {
          this.data = data;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
  } as GithubCache);
};

const createrLoader = ({
  notFound,
  setData,
}: {
  notFound: (lazy: boolean) => Promise<GithubCacheFile | undefined>;
  setData: (data: GithubCacheFile) => void;
}) =>
  async function load({
    cachePath,
    lazy = false,
  }: {
    cachePath?: string;
    lazy?: boolean;
  }): Promise<void> {
    let obj: GithubCacheFile | undefined;

    if (cachePath && fs.existsSync(cachePath)) {
      obj = parse(
        githubCacheFileSchema,
        JSON.parse(fs.readFileSync(cachePath, 'utf-8')),
        `Invalid cache file at ${cachePath}`,
      );
    } else obj = await notFound(lazy);

    if (obj) setData(obj);
    else
      console.error(
        'Attempted to load @fumadocs/mdx-remote/github cache, but could not retrieve cache and/or files',
      );
  };

const createDiff = (
  cache: GithubCache,
  getFileContent: GetFileContent,
): GithubCache['diff'] => {
  return {
    get applyToCache() {
      return createApplyDiffToCache(cache.data, cache.fs(), getFileContent);
    },
    get compareToGitTree() {
      return createCompareToGitTree(cache.data);
    },
  };
};

const createFileSystem = (
  data: GithubCache['data'],
  tree: GithubCache['tree'],
  diff: GithubCache['diff'],
  getFileContent: GetFileContent,
) => {
  const populateFileSystem = createPopulateFileSystem(data);
  let virtualFileSystem: CacheVirtualFileSystem | undefined;

  return function fileSystem(): CacheVirtualFileSystem {
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

const createCacheBoilerplate = <Env extends 'local' | 'remote'>(
  inherit: GithubCache,
  options: CreateCacheOptions<Env>,
): Omit<GithubCache, 'applyToCache' | 'load' | 'fs' | 'diff'> => {
  let cacheFile: GithubCacheFile | undefined;
  let gitTree: GithubCache['tree'] | undefined;

  const notInitialized = (subject: string): string =>
    `${subject} not initialized. Did you call cache.load?`;

  return {
    get tree() {
      if (!gitTree) throw new Error(notInitialized('Tree'));

      return gitTree;
    },
    set tree(value) {
      gitTree = value;
    },
    get data() {
      if (!cacheFile) throw new Error(notInitialized('Cache'));

      return cacheFile;
    },
    set data(value) {
      githubCacheFileSchema.parse(value);
      cacheFile = value;
    },
    get generatePageTree() {
      return createGeneratePageTree((this as GithubCache).fs(), {
        include: options.include,
      });
    },
    get resolveAllContent() {
      return createContentResolver(this.data, (this as GithubCache).fs());
    },
  };
};

const enhancedCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
  inherit: GithubCache,
): GithubCache => {
  const boilerplate = createCacheBoilerplate(inherit, options);

  return Object.defineProperties(
    inherit,
    Object.getOwnPropertyDescriptors(boilerplate),
  );
};
