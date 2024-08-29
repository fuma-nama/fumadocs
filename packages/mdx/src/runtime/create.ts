import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import {
  type EntryFromCollection,
  type Collections,
  type FileInfo,
  type CollectionEntry,
} from '@/config';
import { resolveFiles } from '@/runtime/resolve-files';

export function toRuntime(
  file: Record<string, unknown>,
  info: FileInfo,
): EntryFromCollection<Collections> {
  const { default: body, frontmatter, ...exports } = file;

  return {
    body,
    ...exports,
    ...(frontmatter as object),
    _file: info,
  };
}

export function createMDXSource<
  Doc extends CollectionEntry<'doc', PageData>,
  Meta extends CollectionEntry<'meta', MetaData>,
>(
  docs: Doc[],
  meta: Meta[],
): Source<{
  metaData: Meta;
  pageData: Doc;
}> {
  return {
    files: (rootDir) =>
      resolveFiles({
        docs,
        meta,
        rootDir,
      }),
  };
}
