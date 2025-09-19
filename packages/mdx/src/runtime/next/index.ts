import type { VirtualFile } from 'fumadocs-core/source';
import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import type { DocOut, FileInfo, Runtime } from './types';
import { readFileSync } from 'node:fs';
import type { CompiledMDXProperties } from '@/utils/build-mdx';
import { readFile } from 'node:fs/promises';
import { missingProcessedMarkdown } from '@/runtime/shared';

export interface BaseCollectionEntry {
  _file: FileInfo;
}

const cache = new Map<string, string>();

export const _runtime: Runtime = {
  doc(files) {
    return files.map((file) => {
      const data = file.data as unknown as CompiledMDXProperties;
      const filePath = file.info.absolutePath;

      return {
        _file: file.info,
        _exports: data as unknown as Record<string, unknown>,
        body: data.default,
        lastModified: data.lastModified,
        toc: data.toc,
        structuredData: data.structuredData,
        extractedReferences: data.extractedReferences,
        ...data.frontmatter,
        get content() {
          const cached = cache.get(filePath);
          if (cached) return cached;

          const content = readFileSync(filePath).toString();
          cache.set(filePath, content);
          return content;
        },
        async getText(type) {
          console.log(data);
          if (type === 'raw') {
            return (await readFile(filePath)).toString();
          }

          if (typeof data._markdown !== 'string') missingProcessedMarkdown();
          return data._markdown;
        },
      } satisfies DocOut;
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

export type * from './types';
