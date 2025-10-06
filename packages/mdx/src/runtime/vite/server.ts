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
  type AsyncDocCollectionEntry,
  type DocCollectionEntry,
  type DocData,
  type FileInfo,
  type MetaCollectionEntry,
  missingProcessedMarkdown,
} from '@/runtime/shared';
import fs from 'node:fs/promises';

// for server-side usage of renderers
export { createClientLoader, toClientRenderer } from './browser';

export type { ClientLoader, ClientLoaderOptions } from './browser';
export type * from './types';

export interface ServerCreate<Config> extends BaseCreate<Config> {
  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: DocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: DocCollectionEntry<DocOut>;
      metaData: MetaCollectionEntry<MetaOut>;
    }>
  >;

  sourceLazy: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: LazyDocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: AsyncDocCollectionEntry<DocOut>;
      metaData: MetaCollectionEntry<MetaOut>;
    }>
  >;
}

export function fromConfig<Config>(): ServerCreate<Config> {
  const base = fromConfigBase<Config>();
  function fileInfo(file: string, base: string): FileInfo {
    return {
      path: file,
      fullPath: path.join(base, file),
    };
  }

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

  function mapMetaData<Data>(
    info: FileInfo,
    content: Data,
  ): MetaCollectionEntry<Data> {
    return {
      info,
      ...content,
    };
  }

  return {
    ...base,

    async sourceAsync(doc, meta) {
      const virtualFiles = [
        ...Object.entries(doc).map(async ([file, content]) => {
          const info = fileInfo(file, content.base);

          return {
            type: 'page',
            path: file,
            absolutePath: info.fullPath,
            data: mapPageData(info, await content()),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          const info = fileInfo(file, content.base);

          return {
            type: 'meta',
            path: info.path,
            absolutePath: info.fullPath,
            data: mapMetaData(info, await content()),
          } satisfies VirtualFile;
        }),
      ];

      return {
        files: await Promise.all(virtualFiles),
      };
    },
    async sourceLazy(doc, meta) {
      const virtualFiles = [
        ...Object.entries(doc.head).map(async ([file, frontmatter]) => {
          const info = fileInfo(file, doc.base);

          return {
            type: 'page',
            path: info.path,
            absolutePath: info.fullPath,
            data: mapPageDataLazy(info, await frontmatter(), doc.body[file]),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          const info = fileInfo(file, content.base);

          return {
            type: 'meta',
            path: info.path,
            absolutePath: info.fullPath,
            data: mapMetaData(info, await content()),
          } satisfies VirtualFile;
        }),
      ];

      return {
        files: await Promise.all(virtualFiles),
      };
    },
  };
}
