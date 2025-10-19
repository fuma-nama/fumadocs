import type { VirtualFile } from 'fumadocs-core/source';
import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import type { DocOut, MetaOut, Runtime } from './types';
import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import { createDocMethods, type FileInfo } from '@/runtime/shared';

export const _runtime: Runtime = {
  doc(files) {
    return files.map((file) => {
      const data = file.data as unknown as CompiledMDXProperties;

      return {
        _exports: data as unknown as Record<string, unknown>,
        body: data.default,
        lastModified: data.lastModified,
        toc: data.toc,
        structuredData: data.structuredData,
        extractedReferences: data.extractedReferences,
        ...data.frontmatter,
        ...createDocMethods(file.info, () => Promise.resolve(data)),
      } satisfies DocOut;
    }) as any;
  },
  meta(files) {
    return files.map((file) => {
      return {
        info: file.info,
        ...file.data,
      } satisfies MetaOut;
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

export interface AnyCollectionEntry {
  info: FileInfo;
}

export function createMDXSource<
  Doc extends PageData & AnyCollectionEntry,
  Meta extends MetaData & AnyCollectionEntry,
>(
  docs: Doc[],
  meta: Meta[] = [],
): Source<{
  pageData: Doc;
  metaData: Meta;
}> {
  return {
    files: resolveFiles({
      docs,
      meta,
    }) as VirtualFile<{
      pageData: Doc;
      metaData: Meta;
    }>[],
  };
}

interface ResolveOptions {
  docs: AnyCollectionEntry[];
  meta: AnyCollectionEntry[];

  rootDir?: string;
}

export function resolveFiles({ docs, meta }: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const entry of docs) {
    outputs.push({
      type: 'page',
      absolutePath: entry.info.fullPath,
      path: entry.info.path,
      data: entry as any,
    });
  }

  for (const entry of meta) {
    outputs.push({
      type: 'meta',
      absolutePath: entry.info.fullPath,
      path: entry.info.path,
      data: entry as any,
    });
  }

  return outputs;
}

export type * from './types';
