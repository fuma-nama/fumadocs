import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import { type BaseCollectionEntry, type FileInfo } from '@/config';
import { resolveFiles } from '@/runtime/resolve-files';

export function toRuntime(
  type: 'doc' | 'meta',
  file: Record<string, unknown>,
  info: FileInfo,
): unknown {
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

export function toRuntimeAsync(
  frontmatter: Record<string, unknown>,
  load: () => Promise<Record<string, unknown>>,
  info: FileInfo,
): unknown {
  return {
    async load() {
      const { default: body, ...res } = await load();

      return {
        body,
        ...res,
      };
    },
    ...frontmatter,
    _file: info,
  };
}

export function createMDXSource<
  Doc extends PageData & BaseCollectionEntry,
  Meta extends MetaData & BaseCollectionEntry,
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
