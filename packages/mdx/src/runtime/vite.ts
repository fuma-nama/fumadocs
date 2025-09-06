import { createElement, type FC, lazy, type ReactNode } from 'react';
import type { MDXProps } from 'mdx/types';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import type { CompiledMDXProperties } from '@/utils/build-mdx';
import path from 'node:path';

export type CompiledMDXFile<Frontmatter> = CompiledMDXProperties<Frontmatter> &
  Record<string, unknown>;

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

type DocMap<Frontmatter> = Record<
  string,
  (() => Promise<CompiledMDXFile<Frontmatter>>) & { base: string }
>;

type MetaMap<Data> = Record<string, (() => Promise<Data>) & { base: string }>;

interface LazyDocMap<Frontmatter> {
  base: string;
  head: Record<string, () => Promise<Frontmatter>>;
  body: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>;
}

export function fromConfig<Config>(): {
  doc: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? DocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  docLazy: <Name extends keyof Config>(
    name: Name,
    base: string,
    headGlob: Record<string, () => Promise<unknown>>,
    bodyGlob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? LazyDocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  meta: <Name extends keyof Config>(
    name: Name,
    base: string,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | MetaCollection<infer Schema>
    | DocsCollection<StandardSchemaV1, infer Schema>
    ? MetaMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

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
} {
  function normalize<T>(entries: Record<string, T>, base?: string) {
    const out: Record<string, T> = {};

    for (const k in entries) {
      const mappedK = k.startsWith('./') ? k.slice(2) : k;

      if (base) Object.assign(entries[k] as object, { base });
      out[mappedK] = entries[k];
    }

    return out;
  }

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
    doc(_, base, glob) {
      return normalize(glob, base) as any;
    },
    meta(_, base, glob) {
      return normalize(glob, base) as any;
    },
    docLazy(_, base, head, body) {
      return {
        base,
        head: normalize(head),
        body: normalize(body),
      } as any;
    },
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

export interface ClientLoaderOptions<Frontmatter, Props> {
  /**
   * Loader ID (usually your collection name)
   *
   * The code splitting strategy of frameworks like Tanstack Start may duplicate `createClientLoader()` into different chunks.
   *
   * We use loader ID to share cache between multiple instances of client loader.
   *
   * @defaultValue ''
   */
  id?: string;

  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode;
}

type ClientRenderer<Props> = Record<string, FC<Props>>;

export interface ClientLoader<Frontmatter, Props> {
  preload: (path: string) => Promise<CompiledMDXFile<Frontmatter>>;
  /**
   * Get a component that renders content with `React.lazy`
   */
  getComponent: (path: string) => FC<Props>;

  getRenderer: () => ClientRenderer<Props>;
}

const loaderStore = new Map<
  string,
  {
    preloaded: Map<string, CompiledMDXFile<any>>;
  }
>();

export function createClientLoader<Frontmatter, Props = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  options: ClientLoaderOptions<Frontmatter, Props>,
): ClientLoader<Frontmatter, Props> {
  const { id = '', component } = options;
  let renderer: ClientRenderer<Props> | undefined;
  const store = loaderStore.get(id) ?? {
    preloaded: new Map(),
  };
  loaderStore.set(id, store);

  function getRenderer() {
    if (renderer) return renderer;

    renderer = {};
    for (const k in files) {
      const OnDemand = lazy(async () => {
        const loaded = await files[k]();
        return { default: (props) => component(loaded, props) };
      });

      renderer[k] = (props: Props) => {
        const cached = store.preloaded.get(k);
        if (!cached) return createElement(OnDemand, props);
        return component(cached, props);
      };
    }

    return renderer;
  }

  return {
    async preload(path) {
      const loaded = await files[path]();
      store.preloaded.set(path, loaded);
      return loaded;
    },
    getRenderer,
    getComponent(path) {
      return getRenderer()[path];
    },
  };
}

export function toClientRenderer<Frontmatter, Props = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode,
): ClientRenderer<Props> {
  return createClientLoader(files, { component }).getRenderer();
}
