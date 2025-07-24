import type { VirtualFile } from 'fumadocs-core/source';
import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import type { BaseCollectionEntry, FileInfo, Runtime } from '@/runtime/types';
import fs from 'node:fs';

const cache = new Map<string, string>();

export const _runtime: Runtime = {
  doc(files) {
    return files.map((file) => {
      const { default: body, frontmatter, ...exports } = file.data;

      return {
        body,
        ...exports,
        ...(frontmatter as object),
        _file: file.info,
        _exports: file.data,
        get content() {
          const path = (this as { _file: FileInfo })._file.absolutePath;
          const cached = cache.get(path);
          if (cached) return cached;

          const content = fs.readFileSync(path).toString();
          cache.set(path, content);
          return content;
        },
      };
    }) as any;
  },
  meta(files) {
    return files.map((file) => {
      return {
        ...file.data,
        _file: file.info,
      };
    }) as any;
  },
  docs(docs, metas) {
    const parsedDocs = this.doc(docs);
    const parsedMetas = this.meta(metas);

    return {
      docs: parsedDocs,
      meta: parsedMetas,
      toFumadocsSource() {
        return createMDXSource(parsedDocs, parsedMetas);
      },
    } as any;
  },
};

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
    files: () =>
      resolveFiles({
        docs,
        meta,
      }),
  };
}

interface ResolveOptions {
  docs: BaseCollectionEntry[];
  meta: BaseCollectionEntry[];

  rootDir?: string;
}

export function resolveFiles({ docs, meta }: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const entry of docs) {
    outputs.push({
      type: 'page',
      absolutePath: entry._file.absolutePath,
      path: entry._file.path,
      data: entry,
    });
  }

  for (const entry of meta) {
    outputs.push({
      type: 'meta',
      absolutePath: entry._file.absolutePath,
      path: entry._file.path,
      data: entry,
    });
  }

  return outputs;
}
