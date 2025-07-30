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

type MDXFileToPageData<Frontmatter> = Frontmatter &
  Omit<CompiledMDXProperties<Frontmatter>, 'frontmatter'> & {
    _exports: Record<string, unknown>;
  };

type AttachGlobValue<GlobValue, Attach> =
  GlobValue extends () => Promise<unknown> ? () => Promise<Attach> : Attach;

export function fromConfig<Config>(): {
  doc: <Name extends keyof Config, GlobValue>(
    name: Name,
    glob: Record<string, GlobValue>,
  ) => Config[Name] extends DocCollection<infer Schema>
    ? Record<
        string,
        AttachGlobValue<
          GlobValue,
          CompiledMDXFile<StandardSchemaV1.InferOutput<Schema>>
        >
      >
    : never;

  meta: <Name extends keyof Config, GlobValue>(
    name: Name,
    glob: Record<string, GlobValue>,
  ) => Config[Name] extends MetaCollection<infer Schema>
    ? AttachGlobValue<GlobValue, StandardSchemaV1.InferOutput<Schema>>
    : never;

  docs: <Name extends keyof Config, DocGlobValue, MetaGlobValue>(
    name: Name,
    options: {
      meta: Record<string, MetaGlobValue>;
      doc: Record<string, DocGlobValue>;
    },
  ) => Config[Name] extends DocsCollection<infer DocSchema, infer MetaSchema>
    ? {
        doc: Record<
          string,
          AttachGlobValue<
            DocGlobValue,
            CompiledMDXFile<StandardSchemaV1.InferOutput<DocSchema>>
          >
        >;
        meta: Record<
          string,
          AttachGlobValue<
            MetaGlobValue,
            StandardSchemaV1.InferOutput<MetaSchema>
          >
        >;
      }
    : never;
  source: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: Record<string, CompiledMDXFile<DocOut>>,
    meta: Record<string, MetaOut>,
  ) => Source<{
    pageData: MDXFileToPageData<DocOut>;
    metaData: MetaOut;
  }>;

  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: Record<string, () => Promise<CompiledMDXFile<DocOut>>>,
    meta: Record<string, () => Promise<MetaOut>>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageData<DocOut>;
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
      toc,
      structuredData,
      lastModified,
      _exports: entry,
    };
  }

  return {
    doc(_, glob) {
      return normalize(glob) as any;
    },
    meta(_, glob) {
      return normalize(glob) as any;
    },
    docs(_, { doc, meta }) {
      return {
        doc: normalize(doc),
        meta: normalize(meta),
      } as any;
    },
    source(doc, meta) {
      const virtualFiles: VirtualFile[] = [];
      for (const [file, content] of Object.entries(doc)) {
        virtualFiles.push({
          type: 'page',
          path: file,
          data: mapPageData(content),
        });
      }

      for (const [file, content] of Object.entries(meta)) {
        virtualFiles.push({
          type: 'meta',
          path: file,
          data: content,
        });
      }

      return {
        files: virtualFiles,
      };
    },
    async sourceAsync(doc, meta) {
      const virtualFiles: VirtualFile[] = [];

      for (const [file, content] of Object.entries(doc)) {
        virtualFiles.push({
          type: 'page',
          path: file,
          data: mapPageData(await content()),
        });
      }

      for (const [file, content] of Object.entries(meta)) {
        virtualFiles.push({
          type: 'meta',
          path: file,
          data: await content(),
        });
      }

      return {
        files: virtualFiles,
      };
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
