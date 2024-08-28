import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import {
  type CollectionEntry,
  type Collections,
  type FileInfo,
} from '@/config';
import { resolveFiles } from '@/runtime/resolve-files';

export function toRuntime(
  file: Record<string, unknown>,
  info: FileInfo,
): CollectionEntry<Collections> {
  const { default: body, frontmatter, ...exports } = file;

  return {
    body,
    ...exports,
    ...(frontmatter as object),
    _file: info,
  };
}

export function createMDXSource<
  Doc extends CollectionEntry<any> & PageData,
  Meta extends CollectionEntry<any> & MetaData,
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
