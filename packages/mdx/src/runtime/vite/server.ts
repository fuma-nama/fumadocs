import type { CompiledMDXFile, DocMap, LazyDocMap, MetaMap } from './types';
import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import { type BaseCreate, fromConfigBase } from '@/runtime/vite/base';
import * as path from 'node:path';
import {
  AsyncDocCollectionEntry,
  DocCollectionEntry,
  DocData,
  missingProcessedMarkdown,
} from '@/runtime/shared';
import fs from 'node:fs/promises';

// for server-side usage of renderers
export { createClientLoader, toClientRenderer } from './browser';
export type { ClientLoader, ClientLoaderOptions } from './browser';

export type { CompiledMDXFile } from './types';

export interface ServerCreate<Config> extends BaseCreate<Config> {
  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: DocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: DocCollectionEntry<DocOut>;
      metaData: MetaOut;
    }>
  >;

  sourceLazy: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: LazyDocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: AsyncDocCollectionEntry<DocOut>;
      metaData: MetaOut;
    }>
  >;
}

export function fromConfig<Config>(): ServerCreate<Config> {
  const base = fromConfigBase<Config>();
  function mapDocData(entry: CompiledMDXFile<any>): DocData {
    return {
      body: entry.default,
      toc: entry.toc,
      extractedReferences: entry.extractedReferences,
      structuredData: entry.structuredData,
      lastModified: entry.lastModified,
      _exports: entry,
    };
  }

  function mapPageData<Frontmatter>(
    filePath: string,
    entry: CompiledMDXFile<Frontmatter>,
  ): DocCollectionEntry<Frontmatter> {
    return {
      ...mapDocData(entry),
      get content(): string {
        throw new Error('not implemented on Vite.');
      },
      async getText(type) {
        if (type === 'raw') {
          return (await fs.readFile(filePath)).toString();
        }

        if (typeof entry._markdown !== 'string') missingProcessedMarkdown();
        return entry._markdown;
      },
      ...entry.frontmatter,
    };
  }

  function mapPageDataLazy<Frontmatter>(
    filePath: string,
    head: Frontmatter,
    content: () => Promise<CompiledMDXFile<Frontmatter>>,
  ): AsyncDocCollectionEntry<Frontmatter> {
    return {
      ...head,
      async load() {
        return mapDocData(await content());
      },
      get content(): string {
        throw new Error('not implemented on Vite.');
      },
      async getText(type) {
        if (type === 'raw') {
          return (await fs.readFile(filePath)).toString();
        }

        const entry = await content();
        if (typeof entry._markdown !== 'string') missingProcessedMarkdown();
        return entry._markdown;
      },
    };
  }

  return {
    ...base,

    async sourceAsync(doc, meta) {
      const virtualFiles: Promise<VirtualFile>[] = [
        ...Object.entries(doc).map(async ([file, content]) => {
          const fullPath = path.join(content.base, file);

          return {
            type: 'page',
            path: file,
            absolutePath: fullPath,
            data: mapPageData(fullPath, await content()),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          return {
            type: 'meta',
            path: file,
            absolutePath: path.join(content.base, file),
            data: await content(),
          } satisfies VirtualFile;
        }),
      ];

      return { files: await Promise.all(virtualFiles) };
    },
    async sourceLazy(doc, meta) {
      const virtualFiles: Promise<VirtualFile>[] = [
        ...Object.entries(doc.head).map(async ([file, frontmatter]) => {
          const fullPath = path.join(doc.base, file);

          return {
            type: 'page',
            path: file,
            absolutePath: fullPath,
            data: mapPageDataLazy(
              fullPath,
              await frontmatter(),
              doc.body[file],
            ),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          return {
            type: 'meta',
            path: file,
            absolutePath: path.join(content.base, file),
            data: await content(),
          } satisfies VirtualFile;
        }),
      ];

      return { files: await Promise.all(virtualFiles) };
    },
  };
}
