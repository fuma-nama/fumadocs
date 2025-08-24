import type { TableOfContents } from 'fumadocs-core/server';
import { createElement, type FC, lazy, type ReactNode } from 'react';
import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';

interface CompiledMDXProperties<Frontmatter> {
  frontmatter: Frontmatter;
  structuredData: StructuredData;
  toc: TableOfContents;
  default: FC<MDXProps>;

  /**
   * Only available when `lastModifiedTime` is enabled on MDX loader
   */
  lastModified?: Date;
}

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

interface LazyDocMap<Frontmatter> {
  head: Record<string, () => Promise<Frontmatter>>;
  body: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>;
}

export function fromConfig<Config>(): {
  doc: <Name extends keyof Config>(
    name: Name,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? Record<
        string,
        () => Promise<CompiledMDXFile<StandardSchemaV1.InferOutput<Schema>>>
      >
    : never;

  docLazy: <Name extends keyof Config>(
    name: Name,
    headGlob: Record<string, () => Promise<unknown>>,
    bodyGlob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | DocCollection<infer Schema>
    | DocsCollection<infer Schema>
    ? LazyDocMap<StandardSchemaV1.InferOutput<Schema>>
    : never;

  meta: <Name extends keyof Config>(
    name: Name,
    glob: Record<string, () => Promise<unknown>>,
  ) => Config[Name] extends
    | MetaCollection<infer Schema>
    | DocsCollection<StandardSchemaV1, infer Schema>
    ? Record<string, () => Promise<StandardSchemaV1.InferOutput<Schema>>>
    : never;

  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: Record<string, () => Promise<CompiledMDXFile<DocOut>>>,
    meta: Record<string, () => Promise<MetaOut>>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageData<DocOut>;
      metaData: MetaOut;
    }>
  >;

  sourceLazy: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: LazyDocMap<DocOut>,
    meta: Record<string, () => Promise<MetaOut>>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageDataLazy<DocOut>;
      metaData: MetaOut;
    }>
  >;
} {
  function normalize(entries: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const k in entries) {
      const mappedK = k.startsWith('./') ? k.slice(2) : k;
      out[mappedK] = entries[k];
    }
    return out;
  }

  function mapPageData<Frontmatter>(
    entry: CompiledMDXFile<Frontmatter>,
  ): MDXFileToPageData<Frontmatter> {
    const { toc, structuredData, lastModified, frontmatter } = entry;

    return {
      ...frontmatter,
      default: entry.default,
      body: entry.default,
      toc,
      structuredData,
      lastModified,
      _exports: entry,
    };
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
    doc(_, glob) {
      return normalize(glob) as any;
    },
    meta(_, glob) {
      return normalize(glob) as any;
    },
    docLazy(_, head, body) {
      return {
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
            data: mapPageData(await content()),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          return {
            type: 'meta',
            path: file,
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
            data: mapPageDataLazy(await frontmatter(), doc.body[file]),
          } satisfies VirtualFile;
        }),
        ...Object.entries(meta).map(async ([file, content]) => {
          return {
            type: 'meta',
            path: file,
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

export interface ClientLoader<Frontmatter, Props> {
  preload: (path: string) => Promise<CompiledMDXFile<Frontmatter>>;
  /**
   * Get a component that renders content with `React.lazy`
   */
  getComponent: (path: string) => FC<Props>;
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
  const store = loaderStore.get(id) ?? {
    preloaded: new Map(),
  };
  loaderStore.set(id, store);

  let renderer;

  return {
    async preload(path) {
      const loaded = await files[path]();
      store.preloaded.set(path, loaded);
      return loaded;
    },
    getComponent(path) {
      renderer ??= toClientRenderer(files, component, {
        cache: store.preloaded,
      });
      return renderer[path];
    },
  };
}

export interface ClientRendererOptions<Frontmatter> {
  cache?: Map<string, CompiledMDXFile<Frontmatter>>;
}

type ClientRenderer<Props> = Record<string, FC<Props>>;

export function toClientRenderer<Frontmatter, Props = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  component: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode,
  options: ClientRendererOptions<Frontmatter> = {},
): ClientRenderer<Props> {
  const { cache } = options;
  const renderer: ClientRenderer<Props> = {};

  for (const k in files) {
    const OnDemand = lazy(async () => {
      const loaded = await files[k]();
      return { default: (props) => component(loaded, props) };
    });

    if (cache) {
      renderer[k] = (props: Props) => {
        const cached = cache.get(k);
        if (!cached) return createElement(OnDemand, props);
        return component(cached, props);
      };
    } else {
      renderer[k] = OnDemand;
    }
  }

  return renderer;
}
