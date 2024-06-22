import type { z } from 'zod';
import type { getTree, GetTreeResponse } from './get-tree';
import type { githubCacheFileSchema } from './schema';
import type {
  createCreateGithubWebhookAPI,
  DiffUtils,
  CacheLoader,
  VirtualFileSystem,
} from './create';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;

export interface BaseCreateCacheOptions {
  /**
   * Base url for documentation
   */
  baseUrl?: string;
  /**
   * Current working directory.
   * @defaultValue process.cwd()
   */
  cwd?: string;
  /**
   * Enable or disable saving the cache to the disk.
   * @defaultValue `true`
   */
  saveFile?: boolean;
  // compilerOptions?: Pick<CompileOptions, 'mdxOptions' | 'components'>;
  /**
   * Included files.
   *
   * @defaultValue '.&#47;**&#47;*.&#123;md,mdx,json&#125;'
   */
  include?: string | string[];
  /**
   * Directory to search for files (local or remote)
   */
  directory?: string;
}

export interface GlobalCache {
  /**
   * Get the cache data.
   */
  getData: () => Promise<GithubCacheFile>;
  /**
   * Get the tree used for analysis.
   */
  getTree: () => Promise<GetTreeResponse>;
  /**
   * File system utilities for the cache.
   * Mostly oriented for page tree generation.
   */
  getFileSystem: () => VirtualFileSystem;
  /**
   * Reads the cache from the disk, or interprets new cache from files (local or remote)
   */
  load: CacheLoader['load'];
  /**
   * Resolves all content (content is stored as a promise) in the cache and returns their resolved values.
   * This is useful when preparing the cache to be saved to the disk.
   */
  resolveAllContent: () => Promise<GithubCacheFile>;

  updateTree: (tree: GetTreeResponse) => void;

  /**
   * Functions relating to making changes the cache
   */
  diff: DiffUtils;

  _options: {
    include: string | string[];
  };
}

export interface GithubCache extends GlobalCache {
  /**
   * Used in production to update the cache with new data when pushing to the repository.
   */
  createGithubWebhookAPI: ReturnType<typeof createCreateGithubWebhookAPI>;
}

export interface CreateCacheRemoteOptions extends BaseCreateCacheOptions {
  owner: string;
  repo: string;

  /**
   * GitHub access token
   */
  token?: string;

  /**
   * Tag to revalidate cache
   *
   * @defaultValue 'nd-github'
   */
  revalidateTag?: string;

  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  branch: string;
  githubApi?: Pick<Parameters<typeof getTree>[0], 'init' | 'recursive'>;
}

export type CreateCacheLocalOptions = Omit<
  BaseCreateCacheOptions,
  'directory'
> &
  Required<Pick<BaseCreateCacheOptions, 'directory'>>;
