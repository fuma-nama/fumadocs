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
import { lazy, loadStructuredData, merge, pageAt, type PageAt } from '@/utils/page';
import type { InternalTypeConfig, DocData, DocMethods, FileInfo, MetaMethods } from './types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { createElement, use } from 'react';

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

/** @param structuredData - read from the page without rendering, unless given */
function toDocData(
  page: PageAt<CompiledMDXProperties> & { lastModified?: Date },
  exports: CompiledMDXProperties,
  structuredData?: StructuredData,
): DocData {
  return lazy(
    {
      body: page.default,
      _exports: exports as unknown as Record<string, unknown>,
      lastModified: page.lastModified,
    },
    {
      toc: () => page.toc,
      structuredData: () => structuredData ?? page.structuredData,
      extractedReferences: () => page.extractedReferences,
    },
  );
}

/** the doc data of a loaded page for its props, its structured data renders components */
async function loadDocData(
  exports: CompiledMDXProperties,
  props: Record<string, unknown>,
): Promise<DocData> {
  return toDocData(pageAt(exports, props), exports, await loadStructuredData(exports, props));
}

/** the exports of a lazy entry, loading them doesn't render its outputs */
type Content = () => Promise<CompiledMDXProperties>;

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
          const exports: CompiledMDXProperties = typeof v === 'function' ? await v() : v;
          const page = pageAt(exports, {});

          return merge<DocCollectionEntry>(
            toDocData(page, exports),
            exports.frontmatter as object,
            createDocMethods(fileInfo(k, base), () => page),
          );
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
          const content = body[k] as Content;

          return {
            ...data,
            ...createDocMethods(fileInfo(k, base), async () => pageAt(await content(), {})),
            async load() {
              return loadDocData(await content(), {});
            },
            async structuredData() {
              return loadStructuredData(await content(), {});
            },
            _content: content,
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
      } satisfies DocsCollectionEntry<Name, PageData, MetaData, TC>;

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
      dataAt: (params, custom) =>
        custom
          ? createDocAt(entry, { ...params, ...custom.props }, custom.data)
          : docAt(entry, params),
    });
  }

  for (const entry of metas) {
    files.push({
      type: 'meta',
      path: baseDir ? PathUtils.joinPath(baseDir, entry.info.path) : entry.info.path,
      absolutePath: entry.info.fullPath,
      data: entry,
      dataAt: dataAt(entry),
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
  if (!page) {
    // the frontmatter in code of each params
    const frontmatter = (doc as { _frontmatterAt?: Record<string, object> })._frontmatterAt?.[key];
    pages.set(key, (page = createDocAt(doc, params, merge(doc, frontmatter))));
  }
  return page;
}

/** the data of a meta module in each folder of its params, see the meta loader */
function dataAt<Meta>(entry: Meta): ((params: Params) => Meta) | undefined {
  const { _dataAt: map, _data: data } = entry as {
    _dataAt?: Record<string, Partial<Meta>>;
    _data?: (params: Params) => Partial<Meta>;
  };
  if (map) return (params) => ({ ...entry, ...(map[JSON.stringify(params)] ?? data?.(params)) });
}

/**
 * The page of an entry for its props, the path params and custom props: its content and outputs render for them.
 *
 * @param base - the data of the page that the content and outputs replace
 */
function createDocAt<Doc extends DocMethods>(
  doc: Doc,
  props: Record<string, unknown>,
  base: Doc,
): Doc {
  // eager entries have the exports, lazy entries load them
  const { _exports: exports, _content: content } = doc as {
    _exports?: CompiledMDXProperties;
    _content?: Content;
  };
  if (!content) {
    const page = pageAt(exports!, props);
    return merge(
      base,
      toDocData(page, exports!),
      createDocMethods(doc.info, () => page),
    );
  }

  let loaded: PageAt<CompiledMDXProperties> | undefined;
  let loading: Promise<PageAt<CompiledMDXProperties>> | undefined;
  let data: Promise<DocData> | undefined;
  const loadPage = () => (loading ??= content().then((v) => (loaded = pageAt(v, props))));
  return {
    ...base,
    ...createDocMethods(doc.info, loadPage),
    // memoized, it can be called in render
    load: () => (data ??= content().then((v) => loadDocData(v, props))),
    structuredData: async () => loadStructuredData(await content(), props),
    ...('body' in doc && {
      preload: () => loadPage().then(() => undefined),
      // like the body of the macro, it renders synchronously when loaded
      body: (props: MDXProps) => createElement((loaded ?? use(loadPage())).default, props),
    }),
  };
}

function createDocMethods(
  info: FileInfo,
  load: () => PageAt<CompiledMDXProperties> | Promise<PageAt<CompiledMDXProperties>>,
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
        const { renderToMarkdown } = await import('fumadocs-core/server');
        // the components of the page props, unless passed here
        const own = options?.components ? { components: options.components } : {};
        return renderToMarkdown(createElement(markdown, own));
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
