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
  FileInfo,
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
    info: FileInfo,
    entry: CompiledMDXFile<Frontmatter>,
  ): DocCollectionEntry<Frontmatter> {
    return {
      ...mapDocData(entry),
      info,
      async getText(type) {
        if (type === 'raw') {
          return (await fs.readFile(info.fullPath)).toString();
        }

        if (typeof entry._markdown !== 'string') missingProcessedMarkdown();
        return entry._markdown;
      },
      ...entry.frontmatter,
    };
  }

  function mapPageDataLazy<Frontmatter>(
    info: FileInfo,
    head: Frontmatter,
    content: () => Promise<CompiledMDXFile<Frontmatter>>,
  ): AsyncDocCollectionEntry<Frontmatter> {
    return {
      ...head,
      info,
      async load() {
        return mapDocData(await content());
      },
      async getText(type) {
        if (type === 'raw') {
          return (await fs.readFile(info.fullPath)).toString();
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
          const info: FileInfo = {
            path: file,
            fullPath: path.join(content.base, file),
          };

          return {
            type: 'page',
            path: file,
            absolutePath: info.fullPath,
            data: mapPageData(info, await content()),
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
          const info: FileInfo = {
            path: file,
            fullPath: path.join(doc.base, file),
          };

          return {
            type: 'page',
            path: file,
            absolutePath: info.fullPath,
            data: mapPageDataLazy(info, await frontmatter(), doc.body[file]),
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
