import type { getTree } from "./get-tree";

type FilterArray<T, U> = T extends U ? T : never;
export type GitTreeItem<T extends 'blob' | 'tree' = 'blob' | 'tree'> =
  FilterArray<Awaited<ReturnType<typeof getTree>>['tree'][number], { type: T }>;

export const blobToUtf8 = (blob: {
  content: string;
  encoding: BufferEncoding;
}): string => {
  return Buffer.from(blob.content, blob.encoding).toString('utf8');
};