import type { GithubCache, GithubCacheFile } from '../types';

export const createContentResolver = (
  cacheFile: GithubCacheFile,
  fs: ReturnType<GithubCache['fs']>,
) =>
  async function resolveAllContent(): Promise<GithubCacheFile> {
    const compressContent = (content: string | undefined): string => {
      const compressed = Buffer.from(content ?? '', 'utf8').toString('hex');
      return compressed;
    };

    const renderFiles = async (
      files: GithubCacheFile['files'],
    ): Promise<NonNullable<unknown>> => {
      return Promise.all(
        files.map(async (file) => ({
          ...file,
          content: compressContent(await fs.readFile(file.path)),
        })),
      );
    };

    const renderSubDirectories = async (
      subDirectories: GithubCacheFile['subDirectories'],
    ): Promise<NonNullable<unknown>> => {
      return await Promise.all(
        subDirectories.map(async (subDirectory) => ({
          ...subDirectory,
          files: await renderFiles(subDirectory.files),
          subDirectories: await renderSubDirectories(
            subDirectory.subDirectories,
          ),
        })),
      );
    };

    return {
      ...cacheFile,
      files: (await renderFiles(cacheFile.files)) as GithubCacheFile['files'],
      subDirectories: (await renderSubDirectories(
        cacheFile.subDirectories,
      )) as GithubCacheFile['subDirectories'],
    };
  };
