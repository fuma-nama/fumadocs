import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import { remarkStructure } from 'fumadocs-core/mdx-plugins';
import type { Options as CompileOptions } from '..';
import {
  createTransformTreeToCache,
  filesToGitTree,
  findTreeRecursive,
} from './git-tree';
import { githubCacheFileSchema } from './schema';
import type { getTree } from './get-tree';
import { getBlob } from './get-blob';
import {
  createPopulateFileSystem,
  createVirtualFileSystem,
  type CacheVirtualFileSystem,
} from './file-system';
import { createApplyDiffToCache, createCompareToGitTree } from './diff';
import { createContentResolver } from './resolve-content';
import {
  blobToUtf8,
  cacheFileToGitTree,
  fnv1a,
  parse,
  type GetFileContent,
} from './utils';
import { createGeneratePageTree } from './page-tree';
import { createCreateGithubWebhookAPI } from './github-webhook';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;
interface BaseCreateCacheOptions
  extends Pick<Parameters<typeof getTree>[0], 'owner' | 'repo' | 'token'> {
  /**
   * Path on disk to store the cache.
   */
  cachePath?: string;
  /**
   * Directory to search for files (local or remote)
   */
  directory?: string;
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
  /**
   * Options provided to the MDX compiler.
   */
  compilerOptions?: Pick<CompileOptions, 'mdxOptions' | 'components'>;
  githubApi?: Pick<Parameters<typeof getTree>[0], 'init' | 'recursive'>;
}

export interface GithubCache<Env extends 'local' | 'remote' = 'local' | 'remote'> {
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
   * Used in produciton to update the cache with new data when pushing to the repository.
   */
  createGithubWebhookAPI: Env extends 'remote' ? ReturnType<typeof createCreateGithubWebhookAPI> : never;
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

export type CreateCacheOptions<
  Env extends 'local' | 'remote' = 'local' | 'remote',
> = Env extends 'local' ? CreateCacheLocalOptions : CreateCacheRemoteOptions;
type CreateCacheRemoteOptions = BaseCreateCacheOptions;
type CreateCacheLocalOptions = Pick<
  BaseCreateCacheOptions,
  'include' | 'cachePath' | 'compilerOptions'
> & {
  directory: NonNullable<BaseCreateCacheOptions['directory']>;
};

export const createCache: (
  options: CreateCacheLocalOptions | CreateCacheRemoteOptions,
) => GithubCache = (options) => {
  const isRemote =
    'owner' in options &&
    'repo' in options &&
    'token' in options &&
    'branch' in options;
  const isLocal = 'directory' in options && !isRemote;

  if (!isRemote && !isLocal)
    throw new Error('Invalid options. View documentation for correct options.');

  return isRemote
    ? createRemoteCache(options)
    : createLocalCache(options as CreateCacheLocalOptions);
};

export const createRemoteCache = (
  options: CreateCacheOptions<'remote'>,
): GithubCache<'remote'> => {
  const { directory, cachePath, githubApi, ...githubInfo } = options;
  const getFileContent: GetFileContent<{ sha: string }> = async (file) => {
    return blobToUtf8(
      await getBlob({
        ...githubInfo,
        ...githubApi,
        fileSha: file.sha,
      }),
    );
  };

  const revalidationTag = `@fumadocs/mdx-remote/github/cache@${fnv1a(
    JSON.stringify(options),
  )}`

  return enhancedCacheBoilerplate(options, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createrLoader({
        cachePath,
        getFileContent,
        notFound: async () => {
          const tree = await findTreeRecursive(directory ?? '', {
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
        set: (k, v) => {
          this[k] = v;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
    get createGithubWebhookAPI() {
      return createCreateGithubWebhookAPI(options.branch, revalidationTag);
    }
  } as GithubCache);
};

export const createLocalCache = (
  options: CreateCacheOptions<'local'>,
): GithubCache<'local'> => {
  const { directory, include = './**/*.{json,md,mdx}', cachePath } = options;

  const getFileContent: GetFileContent<{ path: string }> = async (file) => {
    return fs.promises.readFile(path.resolve(directory, file.path), 'utf8');
  };

  return enhancedCacheBoilerplate(options, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createrLoader({
        cachePath,
        getFileContent,
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
              ignore: cachePath ? [cachePath] : [],
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
        set: (k, v) => {
          this[k] = v;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
  } as GithubCache);
};

const createrLoader = ({
  cachePath,
  set,
  notFound,
  getFileContent,
}: {
  cachePath: string | undefined;
  getFileContent: GetFileContent;
  notFound: (lazy: boolean) => Promise<GithubCacheFile | undefined>;
  set: <T extends keyof GithubCache>(key: T, value: GithubCache[T]) => void;
}) =>
  async function load(options?: { lazy?: boolean }): Promise<void> {
    const { lazy = false } = options ?? {};
    let obj: GithubCacheFile | undefined;

    if (cachePath && fs.existsSync(cachePath)) {
      const raw = await fs.promises.readFile(cachePath, 'utf-8');
      obj = JSON.parse(raw) as GithubCacheFile;
      set(
        'tree',
        Object.assign(cacheFileToGitTree(obj), {
          transformToCache: createTransformTreeToCache(getFileContent),
        }),
      );
    } else obj = await notFound(lazy);

    if (obj) set('data', obj);
    else
      console.error(
        'Attempted to load Github cache, but could not retrieve cache and/or files (local or remote)',
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
  options: CreateCacheOptions<Env>,
): Omit<GithubCache, 'applyToCache' | 'load' | 'fs' | 'diff' | 'createGithubWebhookAPI'> => {
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
      parse(
        githubCacheFileSchema,
        value,
        'Invalid cache file. Please check the schema',
      );
      cacheFile = value;
    },
    get generatePageTree() {
      return createGeneratePageTree(
        (this as GithubCache).fs(),
        Object.assign(
          options.compilerOptions ?? {},
          {
            mdxOptions: {
              remarkPlugins: [remarkStructure]
            }
          } satisfies NonNullable<CreateCacheOptions['compilerOptions']>,
        ),
        {
          include: options.include,
        },
      );
    },
    get resolveAllContent() {
      return createContentResolver(this.data, (this as GithubCache).fs());
    }
  };
};

const enhancedCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
  inherit: GithubCache,
): GithubCache => {
  const boilerplate = createCacheBoilerplate(options);

  return Object.defineProperties(
    inherit,
    Object.getOwnPropertyDescriptors(boilerplate),
  );
};
