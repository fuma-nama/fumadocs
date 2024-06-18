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
  createFillVirtualFileSystem,
  createVirtualFileSystem,
  type GithubCacheVirtualFileSystem,
} from './file-system';
import { createApplyDiff, createCompareTree } from './diff';
import { createRenderer } from './render';
import { blobToUtf8, fnv1a } from './utils';
import { createGeneratePageTree } from './page-tree';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;
export interface CreateCacheOptions
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
  fs: GithubCacheVirtualFileSystem;
  /**
   * Applies a diff to the cache and returns the updated cache.
   */
  applyDiff: ReturnType<typeof createApplyDiff>;
  /**
   * Reads the cache from the disk or from the remote Git tree.
   */
  init: ReturnType<typeof createInit>;

  // Boilerplate

  /**
   * The cache data.
   */
  data: GithubCacheFile;
  /**
   * Get the tree used for analysis.
   */
  tree: NonNullable<Awaited<ReturnType<typeof findTreeRecursive>>>;
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
   * Fills the virtual file system with the cache data.
   */
  fillVirtualFileSystem: ReturnType<typeof createFillVirtualFileSystem>;
  /**
   * Generates a page tree from the cache.
   */
  generatePageTree: ReturnType<typeof createGeneratePageTree>;
}

type GithubCacheRemoteOptions = CreateCacheOptions;
type GithubCacheLocalOptions = Pick<
  CreateCacheOptions,
  'directory' | 'include'
>;

export const createCache: (
  options: GithubCacheLocalOptions | GithubCacheRemoteOptions,
) => GithubCache = (options) =>
  'owner' in options ? createRemoteCache(options) : createLocalCache(options);

export const createRemoteCache = (options: CreateCacheOptions): GithubCache => {
  const { directory, githubApi, ...githubInfo } = options;
  let filledFileSystem:
    | ReturnType<GithubCache['fillVirtualFileSystem']>
    | undefined;

  return enhancedCacheBoilerplate(options, {
    get applyDiff() {
      return createApplyDiff(this.data, this.fs, async (diff) =>
        blobToUtf8(
          await getBlob({
            ...githubInfo,
            ...githubApi,
            fileSha: diff.sha,
          }),
        ),
      );
    },
    get init() {
      return createInit(async () => {
        const tree = await findTreeRecursive(directory, {
          ...githubInfo,
          ...githubApi,
          treeSha: githubInfo.branch,
        });

        if (!tree) return;

        this.data = this.transformTreeToCache(tree);

        return this.data;
      });
    },
    get fs() {
      if (!filledFileSystem) {
        filledFileSystem = this.fillVirtualFileSystem(async (file) =>
          blobToUtf8(
            await getBlob({
              ...githubInfo,
              ...githubApi,
              fileSha: file.sha,
            }),
          ),
        );
      }
      return createVirtualFileSystem(filledFileSystem);
    },
  } as GithubCache);
};

export const createLocalCache = (
  options: GithubCacheLocalOptions,
): GithubCache => {
  const { directory, include = './**/*.{json,md,mdx}' } = options;
  let filledFileSystem:
    | ReturnType<GithubCache['fillVirtualFileSystem']>
    | undefined;

  return enhancedCacheBoilerplate(options, {
    get applyDiff() {
      return createApplyDiff(this.data, this.fs, async (diff) =>
        fs.promises.readFile(path.resolve(directory, diff.path), 'utf8'),
      );
    },
    get init() {
      return createInit(async (scope) => {
        if (scope === "file") return;

        this.tree = await filesToGitTree({
          include,
          directory,
          hasher: async (file) => {
            const { mtimeMs: lastModified } = await fs.promises.stat(
              path.resolve(directory, file)
            );
            return fnv1a(`${file}_${String(lastModified)}`);
          },
        });

        this.data = this.transformTreeToCache(this.tree);

        return this.data;
      });
    },
    get fs() {
      if (!filledFileSystem) {
        filledFileSystem = this.fillVirtualFileSystem(async (file) =>
          fs.promises.readFile(path.resolve(directory, file.path), 'utf8'),
        );
      }
      return createVirtualFileSystem(filledFileSystem);
    },
  } as GithubCache);
};

const createInit = (
  notFound: (scope: 'tree' | 'file') => Promise<GithubCacheFile | undefined>,
) =>
  async function init({
    cachePath,
    scope,
  }: {
    cachePath?: string;
    scope: Parameters<typeof notFound>[0]
  }) {
    let obj: GithubCacheFile | undefined;

    if (cachePath && fs.existsSync(cachePath)) {
      obj = parse(
        githubCacheFileSchema,
        JSON.parse(fs.readFileSync(cachePath, 'utf-8')),
        `Invalid cache file at ${cachePath}`,
      );
    }

    return obj ?? (await notFound(scope));
  };

const createCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: Env extends 'local'
    ? GithubCacheLocalOptions
    : GithubCacheRemoteOptions,
): Omit<GithubCache, 'applyDiff' | 'init' | 'fs'> => {
  let cache: GithubCacheFile | undefined;
  let gitTree: Awaited<ReturnType<typeof findTreeRecursive>>;

  return {
    get tree() {
      if (!gitTree)
        throw new Error('Tree not initialized. Did you call cache.init()?');

      return gitTree;
    },
    set tree(value) {
      gitTree = value;
    },
    get data() {
      if (!cache)
        throw new Error('Cache not initialized. Did you call cache.init()?');

      return cache;
    },
    set data(value) {
      githubCacheFileSchema.parse(value);
      cache = value;
    },
    get compareToTree() {
      return createCompareTree(this.data);
    },
    get transformTreeToCache() {
      return createTransformTreeToCache();
    },
    get fillVirtualFileSystem() {
      return createFillVirtualFileSystem(this.data);
    },
    get generatePageTree() {
      return createGeneratePageTree((this as GithubCache).fs, {
        include: options.include,
      });
    },
    get render() {
      return createRenderer(this.data, (this as GithubCache).fs);
    },
  };
};

const enhancedCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: Env extends 'local'
    ? GithubCacheLocalOptions
    : GithubCacheRemoteOptions,
  inherit: GithubCache,
): GithubCache => {
  const boilerplate = createCacheBoilerplate(options);

  return Object.defineProperties(
    inherit,
    Object.getOwnPropertyDescriptors(boilerplate),
  );
};
