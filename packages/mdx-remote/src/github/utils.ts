import type { ZodError, z } from 'zod';
import type { getTree } from './get-tree';
import type { GithubCacheFile } from './cache';

type FilterArray<T, U> = T extends U ? T : never;

export type GitTreeItem<T extends 'blob' | 'tree' = 'blob' | 'tree'> =
  FilterArray<Awaited<ReturnType<typeof getTree>>['tree'][number], { type: T }>;
export type Awaitable<T> = T | Promise<T>;

export type GetFileContent<T = { path: string; sha: string }> = <U extends T>(
  file: U,
) => Awaitable<string>;

export const blobToUtf8 = (blob: {
  content: string;
  encoding: BufferEncoding;
}): string => {
  return Buffer.from(blob.content, blob.encoding).toString('utf8');
};

export const fnv1a = (str: string): string => {
  const FNV_PRIME = 16777619;
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * FNV_PRIME) % 2 ** 32;
    hash = (hash + str.charCodeAt(i)) % 2 ** 32;
  }

  return hash.toString(16);
};

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

export function parse<T extends z.ZodType<unknown>>(
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

export const cacheFileToGitTree = (
  cacheFile: GithubCacheFile,
): Awaited<ReturnType<typeof getTree>> => {
  const skeleton: Awaited<ReturnType<typeof getTree>> = {
    sha: cacheFile.sha,
    tree: [],
    url: '',
    truncated: false,
  };

  const { files, subDirectories } = cacheFile;

  const addFile = (file: GithubCacheFile['files'][number]): number =>
    skeleton.tree.push({
      type: 'blob',
      sha: file.sha,
      path: file.path,
      url: '',
    });

  const addDirectory = (
    directory: GithubCacheFile['subDirectories'][number],
  ): void => {
    skeleton.tree.push({
      type: 'tree',
      sha: directory.sha,
      path: directory.path,
      url: '',
    });
    for (const file of directory.files) {
      addFile(file);
    }
    for (const subDirectory of directory.subDirectories) {
      addDirectory(subDirectory);
    }
  };

  for (const file of files) {
    addFile(file);
  }

  for (const directory of subDirectories) {
    addDirectory(directory);
  }

  return skeleton;
};
