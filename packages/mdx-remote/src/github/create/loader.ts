import path from 'node:path';
import fs from 'node:fs';
import type { GithubCache, GithubCacheFile } from '../types';
import type { GetFileContent } from '../utils';
import { cacheFileToGitTree, createTransformGitTreeToCache } from './git-tree';

export const createLoader = (
  cacheInstance: GithubCache,
  {
    saveFile,
    notFound,
    getFileContent,
    initialLoad,
    onInitialLoad,
  }: {
    saveFile: string | false;
    getFileContent: GetFileContent;
    notFound: (lazy: boolean) => Promise<GithubCacheFile | undefined>;
    initialLoad?: boolean;
    onInitialLoad?: () => void;
  },
) =>
  async function load(options?: {
    lazy?: boolean;
  }): Promise<typeof cacheInstance> {
    const { lazy = false } = options ?? {};

    if (process.env.NODE_ENV === 'production' && !initialLoad)
      return cacheInstance;

    // TODO make this a customizable condition?
    const isBuildTime = process.env.NEXT_PHASE?.endsWith('build');

    if (
      typeof saveFile === 'string' &&
      fs.existsSync(saveFile) &&
      !isBuildTime
    ) {
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
    }

    if (saveFile && (!fs.existsSync(saveFile) || isBuildTime)) {
      await fs.promises.mkdir(path.dirname(saveFile), { recursive: true });
      await fs.promises.writeFile(
        saveFile,
        JSON.stringify(await cacheInstance.resolveAllContent(), null, 0),
        'utf-8',
      );
    }

    onInitialLoad?.();

    return cacheInstance;
  };
