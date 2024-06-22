import type { z } from 'zod';
import type { getTree } from './get-tree';
import type { githubCacheFileSchema } from './schema';
import type {
  createFumadocsLoader,
  createFileSystem,
  createContentResolver,
  createCreateGithubWebhookAPI,
  createCompileMDX,
  createApplyDiffToCache,
  createCompareToGitTree,
  findTreeRecursive,
  createTransformGitTreeToCache,
  createLoader,
} from './create';

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;
interface BaseCreateCacheOptions
  extends Pick<Parameters<typeof getTree>[0], 'owner' | 'repo' | 'token'> {
  /**
   * Whether or not to save the cache to the disk.
   * @defaultValue `true`
   */
  saveCache?: boolean;
  /**
   * Base url for documentation
   */
  baseUrl?: string;
  /**
   * Current working directory.
   * @defaultValue process.cwd()
   */
  cwd?: string;
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
  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  branch: string;
  githubApi?: Pick<Parameters<typeof getTree>[0], 'init' | 'recursive'>;
}

export interface GithubCache<
  Env extends 'local' | 'remote' = 'local' | 'remote',
> {
  fumadocsLoader: ReturnType<typeof createFumadocsLoader>;
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
  'include' | 'cwd' | 'baseUrl' | 'saveCache'
> & {
  directory: NonNullable<BaseCreateCacheOptions['directory']>;
};
