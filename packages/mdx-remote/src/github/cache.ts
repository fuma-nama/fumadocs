import fs from 'node:fs';
import path from 'node:path';
import type { z } from 'zod';
import { remarkStructure } from 'fumadocs-core/mdx-plugins';
import { compile as compileMDX, type Options as CompileOptions } from '..';
import {
  createTransformGitTreeToCache,
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
   * Current working directory.
   * @defaultValue process.cwd()
   */
  cwd?: string;
  /**
   * Path on disk to store the cache.
   * Pass `false` to disable storing the cache.
   * @defaultValue .fumadocs/cache.json (relative to cwd)
   */
  saveFile?: string | false;
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

export interface GithubCache<
  Env extends 'local' | 'remote' = 'local' | 'remote',
> {
  /**
   * The hash used to revalidate the cache.
   */
  revalidationTag: string;
  /**
   * The cache data.
   */
  data: GithubCacheFile;
  /**
   * File system utilities for the cache.
   * Mostly oriented for page tree generation.
   */
  fs: ReturnType<typeof createFileSystem>;
  /**
   * Reads the cache from the disk, or interprets new cache from files (local or remoate)
   */
  load: ReturnType<typeof createLoader>;
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
  createGithubWebhookAPI: Env extends 'remote'
    ? ReturnType<typeof createCreateGithubWebhookAPI>
    : never;
  /**
   * Compiles source (string) to MDX.
   */
  compileMDX: ReturnType<typeof createCompileMDX>;
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
    transformToCache: ReturnType<typeof createTransformGitTreeToCache>;
  };
}

export type CreateCacheOptions<
  Env extends 'local' | 'remote' = 'local' | 'remote',
> = Env extends 'local' ? CreateCacheLocalOptions : CreateCacheRemoteOptions;
type CreateCacheRemoteOptions = BaseCreateCacheOptions;
type CreateCacheLocalOptions = Pick<
  BaseCreateCacheOptions,
  'include' | 'saveFile' | 'compilerOptions'
> & {
  directory: NonNullable<BaseCreateCacheOptions['directory']>;
};

export const createCache = <Options extends CreateCacheOptions>(
  options: Options,
): GithubCache<
  Options extends {
    owner: string;
    repo: string;
    token?: string;
    branch: string;
  }
    ? 'remote'
    : 'local'
> => {
  const isRemote =
    'owner' in options &&
    'repo' in options &&
    'token' in options &&
    'branch' in options;
  const isLocal = 'directory' in options && !isRemote;

  if (!isRemote && !isLocal)
    throw new Error('Invalid options. View documentation for correct options.');

  const revalidationTag = `@fumadocs/mdx-remote/github/cache@${fnv1a(
    JSON.stringify(options),
  )}`;

  return (
    isRemote
      ? createRemoteCache(options, revalidationTag)
      : createLocalCache(
          options as CreateCacheOptions<'local'>,
          revalidationTag,
        )
  ) as GithubCache<
    Options extends {
      owner: string;
      repo: string;
      token?: string;
      branch: string;
    }
      ? 'remote'
      : 'local'
  >;
};

export const createRemoteCache = (
  { cwd = process.cwd(), ...options }: CreateCacheOptions<'remote'>,
  revalidationTag: string,
): GithubCache<'remote'> => {
  const {
    directory,
    saveFile = path.resolve(cwd, '.fumadocs', 'cache.json'),
    githubApi,
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

  return enhancedCacheBoilerplate(options, revalidationTag, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createLoader(this, {
        saveFile,
        getFileContent,
        notFound: async () => {
          const tree = await findTreeRecursive(directory ?? '', {
            ...githubInfo,
            ...githubApi,
            treeSha: githubInfo.branch,
          });

          if (!tree) return;

          this.tree = Object.assign(tree, {
            transformToCache: createTransformGitTreeToCache(getFileContent),
          });

          return this.tree.transformToCache(tree);
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
    get createGithubWebhookAPI() {
      return createCreateGithubWebhookAPI({
        tree: this.tree,
        diff: this.diff,
        ref: options.branch,
        directory: options.directory ?? '',
        githubOptions: {
          ...githubInfo,
          ...githubApi,
        },
        revalidationTag,
        set: (key, value) => {
          this[key] = value;
        },
      });
    },
  } as GithubCache);
};

export const createLocalCache = (
  options: CreateCacheOptions<'local'>,
  revalidationTag: string,
): GithubCache<'local'> => {
  const {
    directory,
    include = './**/*.{json,md,mdx}',
    saveFile = path.resolve(directory, '.fumadocs', 'cache.json'),
  } = options;

  const getFileContent: GetFileContent<{ path: string }> = async (file) => {
    return fs.promises.readFile(path.resolve(directory, file.path), 'utf8');
  };

  return enhancedCacheBoilerplate(options, revalidationTag, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createLoader(this, {
        saveFile,
        getFileContent,
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
              ignore: saveFile ? [saveFile] : [],
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
            transformToCache: createTransformGitTreeToCache(getFileContent),
          });

          this.data = this.tree.transformToCache(this.tree);

          return this.data;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
  } as GithubCache);
};

const createCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
  revalidationTag: string,
): Omit<
  GithubCache,
  'applyToCache' | 'load' | 'fs' | 'diff' | 'createGithubWebhookAPI'
> => {
  let cacheFile: GithubCacheFile | undefined;
  let gitTree: GithubCache['tree'] | undefined;

  const notInitialized = (subject: string): string =>
    `${subject} not initialized. Did you call cache.load?`;

  return {
    revalidationTag,
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
        revalidationTag,
        (this as GithubCache).fs(),
        this.compileMDX,
        {
          include: options.include,
        },
      );
    },
    get resolveAllContent() {
      return createContentResolver(this.data, (this as GithubCache).fs());
    },
    get compileMDX() {
      return createCompileMDX(
        Object.assign(options.compilerOptions ?? {}, {
          mdxOptions: {
            remarkPlugins: [remarkStructure],
          },
        } satisfies NonNullable<CreateCacheOptions['compilerOptions']>),
      );
    },
  };
};

const enhancedCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
  revalidationTag: string,
  inherit: GithubCache,
): GithubCache => {
  const boilerplate = createCacheBoilerplate(options, revalidationTag);

  return Object.defineProperties(
    inherit,
    Object.getOwnPropertyDescriptors(boilerplate),
  );
};

const createLoader = (
  cacheInstance: GithubCache,
  {
    saveFile,
    notFound,
    getFileContent,
  }: {
    saveFile: string | false;
    getFileContent: GetFileContent;
    notFound: (lazy: boolean) => Promise<GithubCacheFile | undefined>;
  },
) =>
  async function load(options?: {
    lazy?: boolean;
  }): Promise<typeof cacheInstance> {
    const { lazy = false } = options ?? {};

    if (typeof saveFile === 'string' && fs.existsSync(saveFile)) {
      const raw = await fs.promises.readFile(saveFile, 'utf-8');
      const data = JSON.parse(raw) as GithubCacheFile;
      cacheInstance.tree = Object.assign(cacheFileToGitTree(data), {
        transformToCache: createTransformGitTreeToCache(getFileContent),
      });
      cacheInstance.data = data;
    } else {
      const data = await notFound(lazy);

      if (data) cacheInstance.data = data;
      else
        throw new Error(
          'Attempted to load Github cache, but could not retrieve cache and/or files (local or remote)',
        );

      if (saveFile) {
        await fs.promises.mkdir(path.dirname(saveFile), { recursive: true });
        await fs.promises.writeFile(
          saveFile,
          JSON.stringify(await cacheInstance.resolveAllContent(), null, 0),
          'utf-8',
        );
      }
    }

    return cacheInstance;
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

const createCompileMDX =
  (compilerOptions: NonNullable<CreateCacheOptions['compilerOptions']>) =>
  async (source: string, options?: CreateCacheOptions['compilerOptions']) => {
    return compileMDX({
      ...Object.assign(compilerOptions, options),
      source,
    });
  };
