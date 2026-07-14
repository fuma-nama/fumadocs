import type { MetaData, PageData, Source } from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { server, toFumadocsSource } from './server';
import type { DocData, DocMethods, MetaMethods } from './types';

export type MacroDocEntry<Frontmatter = unknown, Extra = unknown> = DocData &
  DocMethods &
  Frontmatter &
  Extra;

export type MacroAsyncDocEntry<Frontmatter = unknown, Extra = unknown> = {
  load: () => Promise<DocData & Extra>;
  structuredData: () => Promise<StructuredData>;
} & DocMethods &
  Frontmatter;

export type MacroMetaEntry<Data = unknown> = MetaMethods & Data;

interface EntriesAccessor<Entry> {
  entries: Entry[];

  /**
   * get an entry by its file path (relative to collection directory)
   */
  get: (path: string) => Entry | undefined;
}

export type MacroDocCollection<Frontmatter = unknown, Extra = unknown> = EntriesAccessor<
  MacroDocEntry<Frontmatter, Extra>
>;

export type MacroAsyncDocCollection<Frontmatter = unknown, Extra = unknown> = EntriesAccessor<
  MacroAsyncDocEntry<Frontmatter, Extra>
>;

export type MacroMetaCollection<Data = unknown> = EntriesAccessor<MacroMetaEntry<Data>>;

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

  getPage: (path: string) => MacroDocEntry<Frontmatter, Extra> | undefined;
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

  getPage: (path: string) => MacroAsyncDocEntry<Frontmatter, Extra> | undefined;
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

  /**
   * properties of compiled documents to expose on entries, statically derived from `postprocess` options
   */
  passthroughs?: string[];
}

function create({ passthroughs }: BaseArgs) {
  return server<Record<string, never>, { DocData: Record<string, never> }>({
    doc: { passthroughs },
  });
}

function normalize(file: string): string {
  file = file.replaceAll('\\', '/');
  return file.startsWith('./') ? file.slice(2) : file;
}

function accessor<Entry extends { info: { path: string } }>(
  entries: Entry[],
): EntriesAccessor<Entry> {
  return {
    entries,
    get(path) {
      path = normalize(path);
      return entries.find((entry) => entry.info.path === path);
    },
  };
}

export async function doc(args: BaseArgs & { entries: GlobEntries }): Promise<MacroDocCollection> {
  const entries = (await create(args).doc('doc', args.base, args.entries)) as MacroDocEntry<
    unknown,
    unknown
  >[];

  return accessor(entries as (MacroDocEntry & { info: { path: string } })[]);
}

export async function docAsync(
  args: BaseArgs & { head: GlobEntries; body: LazyGlobEntries },
): Promise<MacroAsyncDocCollection> {
  const entries = (await create(args).docLazy(
    'doc',
    args.base,
    args.head,
    args.body,
  )) as MacroAsyncDocEntry[];

  return accessor(entries as (MacroAsyncDocEntry & { info: { path: string } })[]);
}

export async function meta(
  args: BaseArgs & { entries: GlobEntries },
): Promise<MacroMetaCollection> {
  const entries = (await create(args).meta('meta', args.base, args.entries)) as MacroMetaEntry[];

  return accessor(entries as (MacroMetaEntry & { info: { path: string } })[]);
}

export async function docs(
  args: BaseArgs & { entries: GlobEntries; meta: GlobEntries },
): Promise<MacroDocsCollection> {
  const instance = create(args);
  const [docEntries, metaEntries] = await Promise.all([
    instance.doc('doc', args.base, args.entries) as Promise<MacroDocEntry<PageData>[]>,
    instance.meta('meta', args.base, args.meta) as Promise<MacroMetaEntry<MetaData>[]>,
  ]);
  const getDoc = accessor(docEntries as (MacroDocEntry<PageData> & { info: { path: string } })[]);
  const getMeta = accessor(
    metaEntries as (MacroMetaEntry<MetaData> & { info: { path: string } })[],
  );

  return {
    docs: docEntries,
    meta: metaEntries,
    getPage: getDoc.get,
    getMeta: getMeta.get,
    toFumadocsSource(options) {
      return toFumadocsSource(
        docEntries as (MacroDocEntry<PageData> & DocMethods & PageData)[],
        metaEntries as (MacroMetaEntry<MetaData> & MetaMethods & MetaData)[],
        options,
      );
    },
  };
}

export async function docsAsync(
  args: BaseArgs & { head: GlobEntries; body: LazyGlobEntries; meta: GlobEntries },
): Promise<MacroAsyncDocsCollection> {
  const instance = create(args);
  const [docEntries, metaEntries] = await Promise.all([
    instance.docLazy('doc', args.base, args.head, args.body) as Promise<
      MacroAsyncDocEntry<PageData>[]
    >,
    instance.meta('meta', args.base, args.meta) as Promise<MacroMetaEntry<MetaData>[]>,
  ]);
  const getDoc = accessor(
    docEntries as (MacroAsyncDocEntry<PageData> & { info: { path: string } })[],
  );
  const getMeta = accessor(
    metaEntries as (MacroMetaEntry<MetaData> & { info: { path: string } })[],
  );

  return {
    docs: docEntries,
    meta: metaEntries,
    getPage: getDoc.get,
    getMeta: getMeta.get,
    toFumadocsSource(options) {
      return toFumadocsSource(
        docEntries as (MacroAsyncDocEntry<PageData> & DocMethods & PageData)[],
        metaEntries as (MacroMetaEntry<MetaData> & MetaMethods & MetaData)[],
        options,
      );
    },
  };
}
