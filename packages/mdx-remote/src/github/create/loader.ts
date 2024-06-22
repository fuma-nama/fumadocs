import path from 'node:path';
import fs from 'node:fs';
import type { GithubCache, GithubCacheFile } from '../types';
import type { GetFileContent } from '../utils';
import { cacheFileToGitTree, createTransformGitTreeToCache } from './git-tree';

export const createLoader = (
  cacheInstance: GithubCache,
  {
    cwd,
    saveFile,
    saveCache = true,
    notFound,
    getFileContent,
    initialLoad,
    onInitialLoad,
  }: {
    cwd: string;
    saveFile: string | false;
    saveCache?: boolean;
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

    if (process.env.NODE_ENV === 'production' && !initialLoad) {
      return cacheInstance;
    }

    // TODO make this a customizable condition?
    const isBuildTime = process.env.NEXT_PHASE?.endsWith('build');
    const isDev = process.env.NODE_ENV === 'development';

    if (
      typeof saveFile === 'string' &&
      fs.existsSync(saveFile) &&
      !isBuildTime &&
      !lazy
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

    if (
      (isDev ? saveCache : true) &&
      saveFile &&
      (!fs.existsSync(saveFile) || isBuildTime)
    ) {
      if (isDev)
        await addFumadocsCacheToGitIgnore(cwd, path.relative(cwd, saveFile));

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

const addFumadocsCacheToGitIgnore = async (
  cwd: string,
  file: string,
): Promise<void> => {
  const isGitRepo = fs.existsSync(path.join(cwd, '.git'));
  if (!isGitRepo) return;

  const gitIgnorePath = path.join(cwd, '.gitignore');

  const ignoreValue = `${path.basename(path.dirname(file))}/`;

  if (fs.existsSync(gitIgnorePath)) {
    const gitIgnore = await fs.promises.readFile(gitIgnorePath, 'utf-8');
    if (!gitIgnore.includes(ignoreValue)) {
      await fs.promises.writeFile(
        gitIgnorePath,
        `${gitIgnore}\n# fumadocs\n${ignoreValue}`,
      );
    } else return;
  } else {
    await fs.promises.writeFile(gitIgnorePath, `# fumadocs\n${ignoreValue}`);
  }

  console.info(`[@fumadocs/mdx-remote/github] Added ${file} to .gitignore`);
};
