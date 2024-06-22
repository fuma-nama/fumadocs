import type { getTree } from './get-tree';

type FilterArray<T, U> = T extends U ? T : never;

export type Awaitable<T> = T | Promise<T>;
export type GitTreeItem<T extends 'blob' | 'tree' = 'blob' | 'tree'> =
  FilterArray<Awaited<ReturnType<typeof getTree>>['tree'][number], { type: T }>;

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
