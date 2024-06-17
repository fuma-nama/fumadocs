import fs from 'node:fs';
import path from 'node:path';
import type { z, ZodError } from 'zod';
import { unstable_cache as unstableCache } from 'next/cache';
import {
  createCompareTree,
  findTreeRecursive as findTreeRecursiveInner,
  transformTreeToCache,
} from './utils';
import { githubCacheFileSchema } from './schema';
import type { getTree } from './get-tree';

const findTreeRecursive = unstableCache(
  findTreeRecursiveInner,
  ['@fumadocs/mdx-remote/github/cache'],
  {
    tags: ['@fumadocs/mdx-remote/github/cache'],
  },
);

export type GithubCacheFile = z.infer<typeof githubCacheFileSchema>;

class DataError extends Error {
  constructor(name: string, error: ZodError) {
    const info = error.flatten();

    super(
      `${name}: ${JSON.stringify(
        {
          root: info.formErrors,
          ...info.fieldErrors,
        },
        null,
        2,
      )}`,
    );
    this.name = 'DataError';
  }
}

function parse<T extends typeof githubCacheFileSchema>(
  schema: T,
  object: unknown,
  errorName: string,
): z.infer<T> {
  const result = schema.safeParse(object);

  if (!result.success) {
    throw new DataError(errorName, result.error);
  }

  return result.data;
}

export interface CreateCacheOptions
  extends Pick<Parameters<typeof getTree>[0], 'owner' | 'repo' | 'token'> {
  directory: string;
  /**
   * The SHA1 value or ref (branch or tag) name of the tree.
   */
  branch?: string;
  githubApi?: Omit<
    Parameters<typeof getTree>[0],
    'owner' | 'repo' | 'token' | 'path' | 'treeSha'
  >;
}

export interface GithubCache {
  compareToTree: ReturnType<typeof createCompareTree>;
  read: (cachePath: string) => Promise<GithubCacheFile | undefined>;
  write: (cachePath: string) => void;
}

export const createCache = ({
  directory,
  githubApi,
  ...githubInfo
}: CreateCacheOptions): GithubCache => {
  let cache: GithubCacheFile | undefined;

  return {
    get compareToTree() {
      if (!cache)
        throw new Error('Cache not initialized - call cache.read() first');

      return createCompareTree(cache);
    },
    read: async (cachePath: string) => {
      if (fs.existsSync(cachePath)) {
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

        cache = transformTreeToCache(tree);
      }

      return cache;
    },
    write: (cachePath: string) => {
      if (!cache)
        throw new Error('Cache not initialized - call cache.read() first');

      fs.mkdirSync(path.dirname(cachePath), { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 0));
    },
  };
};
