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
  type SupportedType,
} from '@/config';
import { resolveFiles } from '@/runtime/resolve-files';

export function toRuntime(
  type: SupportedType,
  file: Record<string, unknown>,
  info: FileInfo,
): EntryFromCollection<Collections> {
  if (type === 'doc') {
    const { default: body, frontmatter, ...exports } = file;

    return {
      body,
      ...exports,
      ...(frontmatter as object),
      _exports: file,
      _file: info,
    };
  }

  return {
    ...(file.default as object),
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
  pageData: Doc;
  metaData: Meta;
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
