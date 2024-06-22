import path from 'node:path';
import fs from 'node:fs';
import type { GetTreeResponse } from '@/github/get-tree';
import { resolveAllContent } from '@/github/create/resolve-content';
import type { VirtualFileSystem } from '@/github/create/file-system';
import type { GithubCacheFile } from '../types';
import type { GetFileContent } from '../utils';
import { cacheFileToGitTree } from './git-tree';

interface Loaded {
  tree: GetTreeResponse;
  resolvedFile: GithubCacheFile;
}

export interface CacheLoaderOptions {
  saveFile: string | false;
  getFileContent: GetFileContent;
  fs: VirtualFileSystem;

  /**
   * Resolve cache file when not found
   */
  notFound: (lazy: boolean) => Promise<Loaded | undefined>;
  onInitialLoad?: () => void;
}

export interface CacheLoader {
  load: (lazy?: boolean) => Promise<Loaded>;
}

export function createCacheLoader({
  saveFile,
  notFound,
  onInitialLoad,
  ...ctx
}: CacheLoaderOptions): CacheLoader {
  let tree: GetTreeResponse;
  let resolvedFile: GithubCacheFile;

  return {
    async load(lazy = false) {
      if (process.env.NODE_ENV === 'production')
        return { tree, resolvedFile };

      // TODO make this a customizable condition?
      const isBuildTime = process.env.NEXT_PHASE?.endsWith('build');

      if (
        typeof saveFile === 'string' &&
        fs.existsSync(saveFile) &&
        !isBuildTime
      ) {
        const raw = await fs.promises.readFile(saveFile, 'utf-8');
        const data = JSON.parse(raw) as GithubCacheFile;
        tree = cacheFileToGitTree(data);
        resolvedFile = data;
      } else {
        const data = await notFound(lazy);

        if (data) {
          resolvedFile = data.resolvedFile;
          tree = data.tree;
        } else
          throw new Error(
            'Attempted to load Github cache, but could not retrieve cache and/or files (local or remote)',
          );
      }

      if (saveFile && (!fs.existsSync(saveFile) || isBuildTime)) {
        await fs.promises.mkdir(path.dirname(saveFile), { recursive: true });
        await fs.promises.writeFile(
          saveFile,
          JSON.stringify(
            await resolveAllContent(resolvedFile, ctx.fs),
            null,
            0,
          ),
          'utf-8',
        );
      }

      onInitialLoad?.();

      return {
        resolvedFile,
        tree,
      };
    },
  };
}
