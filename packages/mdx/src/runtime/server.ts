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
import { pageAt, type PageAt } from '@/utils/page';
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

function toDocData(page: PageAt<CompiledMDXProperties>, exports: CompiledMDXProperties): DocData {
  const data: DocData = {
    body: page.default,
    toc: page.toc,
    structuredData: page.structuredData,
    _exports: exports as unknown as Record<string, unknown>,
  };

  for (const key of ['lastModified', 'extractedReferences']) {
    // @ts-expect-error -- handle passthrough properties
    data[key] = page[key];
  }

  return data;
}

async function resolveStructuredData(data: DocData['structuredData']) {
  return typeof data === 'function' ? data() : data;
}

/** the page of compiled exports at params, with its doc data */
function bind(exports: CompiledMDXProperties, params: Params) {
  const page = pageAt(exports, params);
  return { page, data: toDocData(page, exports) };
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
          const exports: CompiledMDXProperties = typeof v === 'function' ? await v() : v;
          const { page, data } = bind(exports, {});

          return {
            ...data,
            ...(exports.frontmatter as object),
            ...createDocMethods(fileInfo(k, base), () => page),
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
            ...createDocMethods(fileInfo(k, base), async () => bind(await content(), {}).page),
            async load() {
              return bind(await content(), {}).data;
            },
            async structuredData() {
              return resolveStructuredData(bind(await content(), {}).page.structuredData);
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
  if (!page) pages.set(key, (page = createDocAt(doc, params, key)));
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

function createDocAt<Doc extends DocMethods>(doc: Doc, params: Params, key: string): Doc {
  // the frontmatter in code of each params
  const frontmatter = (doc as { _frontmatterAt?: Record<string, object> })._frontmatterAt?.[key];
  const at = (data: { _exports?: Record<string, unknown> }) =>
    bind(data._exports as unknown as CompiledMDXProperties, params);
  // eager entries have the exports, lazy entries load them, the macro has both
  const { load } = doc as { load?: () => Promise<DocData> };
  if (!load) {
    const { page, data } = at(doc as { _exports?: Record<string, unknown> });
    return { ...doc, ...data, ...frontmatter, ...createDocMethods(doc.info, () => page) };
  }

  let loaded: ReturnType<typeof at> | undefined;
  let loading: Promise<ReturnType<typeof at>> | undefined;
  let data: Promise<DocData> | undefined;
  const loadPage = () => (loading ??= load().then((data) => (loaded = at(data))));
  return {
    ...doc,
    ...frontmatter,
    ...createDocMethods(doc.info, async () => (await loadPage()).page),
    // memoized, it can be called in render
    load: () => (data ??= loadPage().then((item) => item.data)),
    structuredData: async () => resolveStructuredData((await loadPage()).page.structuredData),
    ...('body' in doc && {
      preload: () => loadPage().then(() => undefined),
      // like the body of the macro, it renders synchronously when loaded
      body: (props: MDXProps) => createElement((loaded ?? use(loadPage())).page.default, props),
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
