import type { GithubCacheFile } from './cache';
import type { GithubCacheVirtualFileSystem } from './file-system';

export const createRenderer = (
  cache: GithubCacheFile,
  fs: GithubCacheVirtualFileSystem,
) =>
  async function render(): Promise<GithubCacheFile> {
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
      ...cache,
      files: (await renderFiles(cache.files)) as GithubCacheFile['files'],
      subDirectories: (await renderSubDirectories(
        cache.subDirectories,
      )) as GithubCacheFile['subDirectories'],
    };
  };
