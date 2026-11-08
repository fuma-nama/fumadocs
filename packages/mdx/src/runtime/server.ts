import {
  type MetaData,
  type PageData,
  type Params,
  PathUtils,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import type { MDXProps } from 'mdx/types';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import type { InternalTypeConfig, DocData, DocMethods, FileInfo, MetaMethods } from './types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createElement, use, type FC } from 'react';

export type MetaCollectionEntry<Data> = Data & MetaMethods;

export type DocCollectionEntry<
  Name extends string = string,
  Frontmatter = unknown,
  TC extends InternalTypeConfig = InternalTypeConfig,
> = DocData & DocMethods & Frontmatter & TC['DocData'][Name];

interface ToFumadocsSourceOptions {
  /** base directory for virtual file paths */
  baseDir?: string;
}

export type AsyncDocCollectionEntry<
  Name extends string = string,
  Frontmatter = unknown,
  TC extends InternalTypeConfig = InternalTypeConfig,
> = {
  load: () => Promise<DocData & TC['DocData'][Name]>;
  structuredData: () => Promise<StructuredData>;
} & DocMethods &
  Frontmatter;

export interface DocsCollectionEntry<
  Name extends string = string,
  Frontmatter extends PageData = PageData,
  Meta extends MetaData = MetaData,
  TC extends InternalTypeConfig = InternalTypeConfig,
> {
  docs: DocCollectionEntry<Name, Frontmatter, TC>[];
  meta: MetaCollectionEntry<Meta>[];
  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: DocCollectionEntry<Name, Frontmatter, TC>;
    metaData: MetaCollectionEntry<Meta>;
  }>;
}

export interface AsyncDocsCollectionEntry<
  Name extends string = string,
  Frontmatter extends PageData = PageData,
  Meta extends MetaData = MetaData,
  TC extends InternalTypeConfig = InternalTypeConfig,
> {
  docs: AsyncDocCollectionEntry<Name, Frontmatter, TC>[];
  meta: MetaCollectionEntry<Meta>[];
  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: AsyncDocCollectionEntry<Name, Frontmatter, TC>;
    metaData: MetaCollectionEntry<Meta>;
  }>;
}

type AwaitableGlobEntries<T> = Record<string, T | (() => Promise<T>)>;

export type ServerCreate<Config, TC extends InternalTypeConfig = InternalTypeConfig> = ReturnType<
  typeof server<Config, TC>
>;

function mapDocData(entry: CompiledMDXProperties): DocData {
  const data: DocData = {
    body: entry.default,
    toc: entry.toc,
    structuredData: entry.structuredData,
    _exports: entry as unknown as Record<string, unknown>,
  };

  for (const key of ['lastModified', 'extractedReferences']) {
    // @ts-expect-error -- handle passthrough properties
    data[key] = entry[key];
  }

  return data;
}

export function server<Config, TC extends InternalTypeConfig>() {
  function fileInfo(file: string, base: string): FileInfo {
    if (file.startsWith('./')) {
      file = file.slice(2);
    }

    return {
      path: file,
      // `joinPath()` drops leading `../` and `/`, which `base` may contain
      fullPath: !base || base.endsWith('/') ? base + file : `${base}/${file}`,
    };
  }

  return {
    async doc<Name extends keyof Config & string>(
      _name: Name,
      base: string,
      glob: AwaitableGlobEntries<unknown>,
    ): Promise<
      Config[Name] extends DocCollection<infer Schema> | DocsCollection<infer Schema>
        ? DocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>[]
        : never
    > {
      const out = await Promise.all(
        Object.entries(glob).map(async ([k, v]) => {
          const data: CompiledMDXProperties = typeof v === 'function' ? await v() : v;

          return {
            ...mapDocData(data),
            ...(data.frontmatter as object),
            ...createDocMethods(fileInfo(k, base), () => data),
          } satisfies DocCollectionEntry;
        }),
      );

      return out as never;
    },
    async docLazy<Name extends keyof Config & string>(
      _name: Name,
      base: string,
      head: AwaitableGlobEntries<unknown>,
      body: Record<string, () => Promise<unknown>>,
    ): Promise<
      Config[Name] extends DocCollection<infer Schema> | DocsCollection<infer Schema>
        ? AsyncDocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>[]
        : never
    > {
      const out = await Promise.all(
        Object.entries(head).map(async ([k, v]) => {
          const data = typeof v === 'function' ? await v() : v;
          const content = body[k] as () => Promise<CompiledMDXProperties>;

          return {
            ...data,
            ...createDocMethods(fileInfo(k, base), content),
            async load() {
              return mapDocData(await content());
            },
            async structuredData() {
              return (await content()).structuredData;
            },
          } satisfies AsyncDocCollectionEntry;
        }),
      );

      return out as never;
    },
    async meta<Name extends keyof Config & string>(
      _name: Name,
      base: string,
      glob: AwaitableGlobEntries<unknown>,
    ): Promise<
      Config[Name] extends
        | MetaCollection<infer Schema>
        | DocsCollection<StandardSchemaV1, infer Schema>
        ? MetaCollectionEntry<StandardSchemaV1.InferOutput<Schema>>[]
        : never
    > {
      const out = await Promise.all(
        Object.entries(glob).map(async ([k, v]) => {
          const data = typeof v === 'function' ? await v() : v;

          return {
            info: fileInfo(k, base),
            ...data,
          } satisfies MetaCollectionEntry<unknown>;
        }),
      );

      return out as never;
    },

    async docs<Name extends keyof Config & string>(
      name: Name,
      base: string,
      metaGlob: AwaitableGlobEntries<unknown>,
      docGlob: AwaitableGlobEntries<unknown>,
    ): Promise<
      Config[Name] extends DocsCollection<infer Page, infer Meta>
        ? StandardSchemaV1.InferOutput<Page> extends PageData
          ? StandardSchemaV1.InferOutput<Meta> extends MetaData
            ? DocsCollectionEntry<
                Name,
                StandardSchemaV1.InferOutput<Page>,
                StandardSchemaV1.InferOutput<Meta>,
                TC
              >
            : never
          : never
        : never
    > {
      const entry = {
        docs: await this.doc(name, base, docGlob),
        meta: await this.meta(name, base, metaGlob),
        toFumadocsSource(options) {
          return toFumadocsSource(this.docs, this.meta, options);
        },
      } satisfies DocsCollectionEntry;

      return entry as never;
    },
    async docsLazy<Name extends keyof Config & string>(
      name: Name,
      base: string,
      metaGlob: AwaitableGlobEntries<unknown>,
      docHeadGlob: AwaitableGlobEntries<unknown>,
      docBodyGlob: Record<string, () => Promise<unknown>>,
    ): Promise<
      Config[Name] extends DocsCollection<infer Page, infer Meta>
        ? StandardSchemaV1.InferOutput<Page> extends PageData
          ? StandardSchemaV1.InferOutput<Meta> extends MetaData
            ? AsyncDocsCollectionEntry<
                Name,
                StandardSchemaV1.InferOutput<Page>,
                StandardSchemaV1.InferOutput<Meta>,
                TC
              >
            : never
          : never
        : never
    > {
      const entry = {
        docs: await this.docLazy(name, base, docHeadGlob, docBodyGlob),
        meta: await this.meta(name, base, metaGlob),
        toFumadocsSource(options) {
          return toFumadocsSource(this.docs, this.meta, options);
        },
      } satisfies AsyncDocsCollectionEntry;

      return entry as never;
    },
  };
}

export function toFumadocsSource<
  Page extends DocMethods & PageData,
  Meta extends MetaMethods & MetaData,
>(
  pages: Page[],
  metas: Meta[],
  options?: ToFumadocsSourceOptions,
): Source<{
  pageData: Page;
  metaData: Meta;
}> {
  const baseDir = options?.baseDir;
  const files: VirtualFile<{
    pageData: Page;
    metaData: Meta;
  }>[] = [];

  for (const entry of pages) {
    files.push({
      type: 'page',
      path: baseDir ? PathUtils.joinPath(baseDir, entry.info.path) : entry.info.path,
      absolutePath: entry.info.fullPath,
      data: entry,
      dataAt: (params) => docAt(entry, params),
    });
  }

  for (const entry of metas) {
    files.push({
      type: 'meta',
      path: baseDir ? PathUtils.joinPath(baseDir, entry.info.path) : entry.info.path,
      absolutePath: entry.info.fullPath,
      data: entry,
    });
  }

  return {
    files,
  };
}

const docAtCache = new WeakMap<object, Map<string, unknown>>();

/** @internal the page of a dynamic file at some params, the same object for the same params */
export function docAt<Doc extends DocMethods>(doc: Doc, params: Params): Doc {
  const key = JSON.stringify(params);
  let pages = docAtCache.get(doc);
  if (!pages) docAtCache.set(doc, (pages = new Map()));
  let page = pages.get(key) as Doc | undefined;
  if (!page) pages.set(key, (page = createDocAt(doc, params, key)));
  return page;
}

function createDocAt<Doc extends DocMethods>(doc: Doc, params: Params, key: string): Doc {
  // the content reads the params as props when rendering
  const bind = (Component: FC<MDXProps>) => (props: MDXProps) =>
    createElement(Component, { ...params, ...props });
  function pick(data: { _exports?: Record<string, unknown> }): CompiledMDXProperties {
    const pages = data._exports?._pages as Record<string, CompiledMDXProperties> | undefined;
    const page = pages?.[key];
    if (!page) throw new Error(`"${doc.info.path}" isn't compiled for ${key}`);
    const { _markdown: markdown } = page;
    return {
      ...page,
      default: bind(page.default),
      _markdown: typeof markdown === 'function' ? bind(markdown) : markdown,
    };
  }

  // eager entries have the exports, lazy entries load them, the macro has both
  const { load } = doc as { load?: () => Promise<DocData> };
  if (!load) {
    const page = pick(doc as { _exports?: Record<string, unknown> });
    return { ...doc, ...mapDocData(page), ...createDocMethods(doc.info, () => page) };
  }

  let loaded: CompiledMDXProperties | undefined;
  let loading: Promise<CompiledMDXProperties> | undefined;
  let data: Promise<DocData> | undefined;
  const loadPage = () => (loading ??= load().then((data) => (loaded = pick(data))));
  return {
    ...doc,
    ...createDocMethods(doc.info, loadPage),
    // memoized like `load()`, it can be called in render
    load: () => (data ??= loadPage().then(mapDocData)),
    structuredData: async () => (await loadPage()).structuredData,
    ...('body' in doc && {
      preload: () => loadPage().then(() => undefined),
      // like the body of the macro, it renders synchronously when loaded
      body: (props: MDXProps) => createElement((loaded ?? use(loadPage())).default, props),
    }),
  };
}

function createDocMethods(
  info: FileInfo,
  load: () => CompiledMDXProperties | Promise<CompiledMDXProperties>,
): DocMethods {
  return {
    info,
    async getText(type, options) {
      if (type === 'raw') {
        const fs = await import('node:fs/promises');

        return await fs.readFile(info.fullPath, 'utf-8');
      }

      const data = await load();
      // the dynamic runtime nests extra exports under `_exports`
      const markdown =
        data._markdown ??
        (data as { _exports?: Pick<CompiledMDXProperties, '_markdown'> })._exports?._markdown;
      if (typeof markdown === 'string') return markdown;
      if (markdown) {
        // a component, generated by `output: 'function'`
        const { renderToMarkdown } = await import('fumadocs-core/server');
        return renderToMarkdown(createElement(markdown, { components: options?.components }));
      }

      throw new Error(
        "getText('processed') requires `includeProcessedMarkdown` to be enabled in your collection config.",
      );
    },
    async getMDAST() {
      const data = await load();

      if (!data._mdast)
        throw new Error(
          'getMDAST() requires `includeMDAST` to be enabled in your collection config.',
        );
      return JSON.parse(data._mdast);
    },
  };
}
