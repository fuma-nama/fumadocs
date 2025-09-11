import type { CompiledMDXFile, DocMap, LazyDocMap, MetaMap } from './types';
import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import type { CompiledMDXProperties } from '@/utils/build-mdx';
import type { FC } from 'react';
import type { MDXProps } from 'mdx/types';
import { type BaseCreate, fromConfigBase } from '@/runtime/vite/base';
import * as path from 'node:path';

// for server-side usage of renderers
export { createClientLoader, toClientRenderer } from './browser';
export type { ClientLoader, ClientLoaderOptions } from './browser';

export type { CompiledMDXFile } from './types';

type Override<A, B> = Omit<A, keyof B> & B;

type MDXFileToPageData<Frontmatter> = Override<
  Omit<CompiledMDXProperties<Frontmatter>, 'frontmatter' | 'default'>,
  Frontmatter & {
    /**
     * @deprecated use `body` instead.
     */
    default: FC<MDXProps>;

    _exports: Record<string, unknown>;
    body: FC<MDXProps>;
  }
>;

type MDXFileToPageDataLazy<Frontmatter> = Override<
  Frontmatter,
  {
    load: () => Promise<
      Omit<CompiledMDXFile<Frontmatter>, 'default'> & {
        body: FC<MDXProps>;
      }
    >;
  }
>;

export interface ServerCreate<Config> extends BaseCreate<Config> {
  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: DocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageData<DocOut>;
      metaData: MetaOut;
    }>
  >;

  sourceLazy: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: LazyDocMap<DocOut>,
    meta: MetaMap<MetaOut>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageDataLazy<DocOut>;
      metaData: MetaOut;
    }>
  >;
}

export function fromConfig<Config>(): ServerCreate<Config> {
  const base = fromConfigBase<Config>();
  function mapPageData<Frontmatter>(entry: CompiledMDXFile<Frontmatter>) {
    const { toc, structuredData, lastModified, frontmatter } = entry;

    return {
      ...frontmatter,
      default: entry.default,
      body: entry.default,
      toc,
      structuredData,
      lastModified,
      _exports: entry,
    } as MDXFileToPageData<Frontmatter>;
  }

  function mapPageDataLazy<Frontmatter>(
    head: Frontmatter,
    content: () => Promise<CompiledMDXFile<Frontmatter>>,
  ): MDXFileToPageDataLazy<Frontmatter> {
    return {
      ...head,
      async load() {
        const { default: body, ...rest } = await content();
        return { body, ...rest };
      },
    };
  }

  return {
    ...base,

    async sourceAsync(doc, meta) {
      const virtualFiles: Promise<VirtualFile>[] = [
        ...Object.entries(doc).map(async ([file, content]) => {
          return {
            type: 'page',
            path: file,
            absolutePath: path.join(content.base, file),
            data: mapPageData(await content()),
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
          return {
            type: 'page',
            path: file,
            absolutePath: path.join(doc.base, file),
            data: mapPageDataLazy(await frontmatter(), doc.body[file]),
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
