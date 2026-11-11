import type { MetaData, PageData, Params, Source } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { MDXContent } from 'mdx/types';
import { docAt, server, toFumadocsSource } from './server';
import { browserMethods } from '@/utils/page';
import type { DocData, DocMethods, MetaMethods } from './types';

export interface BrowserDocMethods {
  /**
   * Preload the content, so it can be rendered synchronously afterwards.
   *
   * In non-RSC apps, call it in your route loader such that `body` doesn't suspend on render.
   *
   * No-op on eagerly loaded (non-`async`) collections.
   */
  preload: () => Promise<void>;
}

export type MacroDocEntry<Frontmatter = unknown, Extra = unknown> = DocData &
  DocMethods &
  BrowserDocMethods &
  Frontmatter &
  Extra;

export type MacroAsyncDocEntry<Frontmatter = unknown, Extra = unknown> = {
  /**
   * Load the compiled content.
   *
   * The promise is memoized, it's safe to call in render (e.g. `use(entry.load())`).
   */
  load: () => Promise<DocData & Extra>;
  structuredData: () => Promise<StructuredData>;
  /**
   * Component rendering the compiled content.
   *
   * It loads the content lazily and suspends (React `use()`) until available, call `preload()` beforehand to render synchronously.
   */
  body: MDXContent;
} & DocMethods &
  BrowserDocMethods &
  Frontmatter;

export type MacroMetaEntry<Data = unknown> = MetaMethods & Data;

export interface MacroDocCollection<Frontmatter = unknown, Extra = unknown> {
  entries: MacroDocEntry<Frontmatter, Extra>[];

  /**
   * get an entry by its file path (relative to collection directory)
   */
  get: (path: string) => MacroDocEntry<Frontmatter, Extra> | undefined;
  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: MacroDocEntry<Frontmatter, Extra>;
    metaData: MetaData;
  }>;
}

export interface MacroAsyncDocCollection<Frontmatter = unknown, Extra = unknown> {
  entries: MacroAsyncDocEntry<Frontmatter, Extra>[];

  /**
   * get an entry by its file path (relative to collection directory)
   */
  get: (path: string) => MacroAsyncDocEntry<Frontmatter, Extra> | undefined;
  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: MacroAsyncDocEntry<Frontmatter, Extra>;
    metaData: MetaData;
  }>;
}

export interface MacroMetaCollection<Data = unknown> {
  entries: MacroMetaEntry<Data>[];

  /**
   * get an entry by its file path (relative to collection directory)
   */
  get: (path: string) => MacroMetaEntry<Data> | undefined;
}

interface ToFumadocsSourceOptions {
  /** base directory for virtual file paths */
  baseDir?: string;
}

export interface MacroDocsCollection<
  Frontmatter extends PageData = PageData,
  Meta extends MetaData = MetaData,
  Extra = unknown,
> {
  docs: MacroDocEntry<Frontmatter, Extra>[];
  meta: MacroMetaEntry<Meta>[];

  /** get a page by its file path, for a file of a dynamic path, its page at `params` */
  getPage: (path: string, params?: Params) => MacroDocEntry<Frontmatter, Extra> | undefined;
  getMeta: (path: string) => MacroMetaEntry<Meta> | undefined;

  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: MacroDocEntry<Frontmatter, Extra>;
    metaData: MacroMetaEntry<Meta>;
  }>;
}

export interface MacroAsyncDocsCollection<
  Frontmatter extends PageData = PageData,
  Meta extends MetaData = MetaData,
  Extra = unknown,
> {
  docs: MacroAsyncDocEntry<Frontmatter, Extra>[];
  meta: MacroMetaEntry<Meta>[];

  /** get a page by its file path, for a file of a dynamic path, its page at `params` */
  getPage: (path: string, params?: Params) => MacroAsyncDocEntry<Frontmatter, Extra> | undefined;
  getMeta: (path: string) => MacroMetaEntry<Meta> | undefined;

  toFumadocsSource: (options?: ToFumadocsSourceOptions) => Source<{
    pageData: MacroAsyncDocEntry<Frontmatter, Extra>;
    metaData: MacroMetaEntry<Meta>;
  }>;
}

type GlobEntries = Record<string, unknown | (() => Promise<unknown>)>;
type LazyGlobEntries = Record<string, () => Promise<unknown>>;

interface BaseArgs {
  base: string;
}

function create() {
  return server<Record<string, never>, { DocData: Record<string, never> }>();
}

function normalize(file: string): string {
  file = file.replaceAll('\\', '/');
  return file.startsWith('./') ? file.slice(2) : file;
}

function accessor<Entry extends { info: { path: string } }>(entries: Entry[]) {
  const byPath = new Map<string, Entry>();
  for (const entry of entries) byPath.set(entry.info.path, entry);
  return {
    entries,
    get(path: string): Entry | undefined {
      return byPath.get(normalize(path));
    },
  };
}

function docAccessor<Entry extends DocMethods>(entries: Entry[]) {
  const { get } = accessor(entries);
  // like the entry of a file, the page of some params is created once: it renders and preloads its content once
  const pages = new Map<string, Entry>();
  return {
    entries,
    get(path: string, params?: Params): Entry | undefined {
      const entry = get(path);
      if (!entry || !params) return entry;
      const key = `${entry.info.path}?${JSON.stringify(params)}`;
      let page = pages.get(key);
      if (!page) pages.set(key, (page = docAt(entry, params)));
      return page;
    },
  };
}

const eagerPreload = async () => {};

function withPreload<Entry extends object>(entries: Entry[]): (Entry & BrowserDocMethods)[] {
  // assigned, a copy would read the outputs of every page
  return entries.map((entry) => Object.assign(entry, { preload: eagerPreload }));
}

type RawAsyncEntry = DocMethods & {
  load: () => Promise<DocData>;
  structuredData: () => Promise<StructuredData>;
};

function asyncEntries(raw: RawAsyncEntry[]): MacroAsyncDocEntry[] {
  for (const entry of raw) Object.assign(entry, browserMethods(entry.load));
  return raw as MacroAsyncDocEntry[];
}

export async function doc(args: BaseArgs & { entries: GlobEntries }): Promise<MacroDocCollection> {
  const entries = withPreload(
    (await create().doc('doc', args.base, args.entries)) as (DocData & DocMethods)[],
  ) as MacroDocEntry<unknown, unknown>[];

  return {
    ...accessor(entries),
    toFumadocsSource(options) {
      return toFumadocsSource(entries, [], options);
    },
  };
}

export async function docAsync(
  args: BaseArgs & { head: GlobEntries; body: LazyGlobEntries },
): Promise<MacroAsyncDocCollection> {
  const entries = asyncEntries(
    (await create().docLazy('doc', args.base, args.head, args.body)) as RawAsyncEntry[],
  );

  return {
    ...accessor(entries),
    toFumadocsSource(options) {
      return toFumadocsSource(entries, [], options);
    },
  };
}

export async function meta(
  args: BaseArgs & { entries: GlobEntries },
): Promise<MacroMetaCollection> {
  const entries = (await create().meta('meta', args.base, args.entries)) as MacroMetaEntry[];

  return accessor(entries);
}

export async function docs(
  args: BaseArgs & { entries: GlobEntries; meta: GlobEntries },
): Promise<MacroDocsCollection> {
  const instance = create();
  const [rawDocEntries, metaEntries] = await Promise.all([
    instance.doc('doc', args.base, args.entries) as Promise<(DocData & DocMethods & PageData)[]>,
    instance.meta('meta', args.base, args.meta) as Promise<MacroMetaEntry<MetaData>[]>,
  ]);
  const docEntries = withPreload(rawDocEntries) as MacroDocEntry<PageData>[];
  const getDoc = docAccessor(docEntries);
  const getMeta = accessor(metaEntries);

  return {
    docs: docEntries,
    meta: metaEntries,
    getPage: getDoc.get,
    getMeta: getMeta.get,
    toFumadocsSource(options) {
      return toFumadocsSource(docEntries, metaEntries, options);
    },
  };
}

export async function docsAsync(
  args: BaseArgs & { head: GlobEntries; body: LazyGlobEntries; meta: GlobEntries },
): Promise<MacroAsyncDocsCollection> {
  const instance = create();
  const [rawDocEntries, metaEntries] = await Promise.all([
    instance.docLazy('doc', args.base, args.head, args.body) as Promise<RawAsyncEntry[]>,
    instance.meta('meta', args.base, args.meta) as Promise<MacroMetaEntry<MetaData>[]>,
  ]);
  const docEntries = asyncEntries(rawDocEntries) as MacroAsyncDocEntry<PageData>[];
  const getDoc = docAccessor(docEntries);
  const getMeta = accessor(metaEntries);

  return {
    docs: docEntries,
    meta: metaEntries,
    getPage: getDoc.get,
    getMeta: getMeta.get,
    toFumadocsSource(options) {
      return toFumadocsSource(docEntries, metaEntries, options);
    },
  };
}
