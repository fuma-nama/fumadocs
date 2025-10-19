import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import {
  type BaseCreate,
  type CompiledMDXFile,
  type DocMap,
  fromConfigBase,
  type LazyDocMap,
  type MetaMap,
} from '@/runtime/vite/base';
import * as path from 'node:path';
import {
  type AsyncDocCollectionEntry,
  createDocMethods,
  type DocCollectionEntry,
  type DocData,
  type FileInfo,
  type MetaCollectionEntry,
} from '@/runtime/shared';

export * from './base';

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
      ...entry.frontmatter,
      ...createDocMethods(info, async () => entry),
    };
  }

  function mapPageDataLazy<Frontmatter>(
    info: FileInfo,
    head: Frontmatter,
    content: () => Promise<CompiledMDXFile<Frontmatter>>,
  ): AsyncDocCollectionEntry<Frontmatter> {
    return {
      ...head,
      ...createDocMethods(info, content),
      async load() {
        return mapDocData(await content());
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
