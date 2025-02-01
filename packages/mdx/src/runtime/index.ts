import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import { type BaseCollectionEntry, type FileInfo } from '@/config';
import type { VirtualFile } from 'fumadocs-core/source';

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

export function createMDXSource<
  Doc extends PageData & BaseCollectionEntry,
  Meta extends MetaData & BaseCollectionEntry,
>(
  docs: Doc[],
  meta: Meta[] = [],
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

interface ResolveOptions {
  docs: BaseCollectionEntry[];
  meta: BaseCollectionEntry[];

  rootDir?: string;
}

export function resolveFiles({
  docs,
  meta,
  rootDir = '',
}: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const entry of docs) {
    if (!entry._file.path.startsWith(rootDir)) continue;

    outputs.push({
      type: 'page',
      path: entry._file.path,
      data: entry,
    });
  }

  for (const entry of meta) {
    outputs.push({
      type: 'meta',
      path: entry._file.path,
      data: entry,
    });
  }

  return outputs;
}
