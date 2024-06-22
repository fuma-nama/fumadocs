import fs from 'node:fs';
import path from 'node:path';
import type { getTree } from './get-tree';
import { getBlob } from './get-blob';
import {
  blobToUtf8,
  fnv1a,
  generateRevalidationTag,
  type Store,
  type GetFileContent,
} from './utils';
import { githubCacheStore } from './store';
import type { CreateCacheOptions, GithubCache } from './types';
import {
  createDiff,
  findTreeRecursive,
  createTransformGitTreeToCache,
  createFileSystem,
  createCreateGithubWebhookAPI,
  filesToGitTree,
  createCacheBoilerplate,
  createLoader,
} from './create';

export const createCache = <
  Options extends CreateCacheOptions,
  Env extends 'local' | 'remote',
>(
  options: Options,
  force?: Env,
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
  const revalidationTag = generateRevalidationTag(options);

  const storedCache = githubCacheStore.get(revalidationTag);
  if (storedCache) return storedCache;

  const isRemote = force
    ? force === 'remote'
    : 'owner' in options &&
      'repo' in options &&
      'token' in options &&
      'branch' in options;
  const isLocal = force
    ? force === 'local'
    : 'directory' in options && !isRemote;

  if (!isRemote && !isLocal)
    throw new Error('Invalid options. View documentation for correct options.');

  const cache = isRemote
    ? createRemoteCache(
        options as CreateCacheOptions<'remote'>,
        revalidationTag,
        githubCacheStore,
      )
    : createLocalCache(options as CreateCacheOptions<'local'>, revalidationTag);

  if (process.env.TSUP) githubCacheStore.set(revalidationTag, cache);

  return cache as GithubCache<
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
  realGithubCacheStore: Store<GithubCache> = githubCacheStore,
): GithubCache<'remote'> => {
  const { directory, githubApi, ...githubInfo } = options;
  const saveFile = path.resolve(process.cwd(), '.next', 'fumadocs-cache.json');

  const getFileContent: GetFileContent<{ sha: string }> = async (file) => {
    return blobToUtf8(
      await getBlob({
        ...githubInfo,
        ...githubApi,
        fileSha: file.sha,
      }),
    );
  };

  let initialLoad = true;

  return enhancedCacheBoilerplate(options, revalidationTag, {
    get diff() {
      return createDiff(this, getFileContent);
    },
    get load() {
      return createLoader(this, {
        cwd,
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
        initialLoad,
        onInitialLoad: () => {
          initialLoad = false;
        },
      });
    },
    get fs() {
      return createFileSystem(this.data, this.tree, this.diff, getFileContent);
    },
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
        githubCacheStore: realGithubCacheStore,
        revalidationTag,
      });
    },
  } as GithubCache);
};

export const createLocalCache = (
  { cwd = process.cwd(), ...options }: CreateCacheOptions<'local'>,
  revalidationTag: string,
): GithubCache<'local'> => {
  const { include = './**/*.{json,md,mdx}' } = options;
  let { directory } = options;

  if (!path.isAbsolute(directory)) {
    directory = path.resolve(cwd, directory);
  }

  const saveFile = path.resolve(process.cwd(), '.next', 'fumadocs-cache.json');

  const getFileContent: GetFileContent<{ path: string }> = async (file) => {
    return fs.promises.readFile(path.resolve(directory, file.path), 'utf8');
  };

  return enhancedCacheBoilerplate(options, revalidationTag, {
    get diff() {
      return createDiff(this as unknown as GithubCache, getFileContent);
    },
    get load() {
      return createLoader(this, {
        cwd,
        saveFile,
        saveCache: options.saveCache,
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

const enhancedCacheBoilerplate = <Env extends 'local' | 'remote'>(
  options: CreateCacheOptions<Env>,
  revalidationTag: string,
  inherit: GithubCache,
): GithubCache => {
  const boilerplate = createCacheBoilerplate(options);

  return Object.defineProperties(
    inherit,
    Object.getOwnPropertyDescriptors(boilerplate),
  );
};
