import type { VirtualFileSystem } from '@/github/create/file-system';
import type { GithubCacheFile } from '../types';

export async function resolveAllContent(
  from: GithubCacheFile,
  fs: VirtualFileSystem,
): Promise<GithubCacheFile> {
  const compressContent = (content: string | undefined): string => {
    return Buffer.from(content ?? '', 'utf8').toString('hex');
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
        subDirectories: await renderSubDirectories(subDirectory.subDirectories),
      })),
    );
  };

  return {
    ...from,
    files: (await renderFiles(from.files)) as GithubCacheFile['files'],
    subDirectories: (await renderSubDirectories(
      from.subDirectories,
    )) as GithubCacheFile['subDirectories'],
  };
}
