import {
  type MetaData,
  type PageData,
  type Params,
  PathUtils,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CompiledMDXProperties } from '@/loaders/mdx/build';
import { bind, browserMethods, defineOutputs, merge, track } from '@/utils/page';
import type { InternalTypeConfig, DocData, DocMethods, FileInfo, MetaMethods } from './types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import { renderStructuredData } from '../../../shared/structured-data';
import { createElement } from 'react';

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
  /** render the structured data, with the MDX components of the page props */
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
          // the entry of a file is its page without props
          return createDocAt<DocCollectionEntry>(
            { info: fileInfo(k, base), _exports: exports },
            undefined,
            exports.frontmatter,
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
          return createDocAt<AsyncDocCollectionEntry>(
            { info: fileInfo(k, base), _content: body[k] as Content },
            undefined,
            data,
          );
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
      dataAt: metaAt(entry),
    });
  }

  return {
    files,
  };
}

/** the data of a meta file in each folder of its params, see the meta loader */
function metaAt<Meta extends MetaMethods & { _dataAt?: Record<string, MetaData> }>(
  meta: Meta,
): ((params: Params) => Meta) | undefined {
  const { _dataAt: at } = meta;
  if (at) return (params) => ({ ...meta, ...at[JSON.stringify(params)] });
}

const docAtCache = new WeakMap<object, Map<string, unknown>>();

/** @internal the page of a dynamic file at some params, the same object for the same params */
export function docAt<Doc extends DocMethods & { _frontmatterAt?: Record<string, object> }>(
  doc: Doc,
  params: Params,
): Doc {
  const key = JSON.stringify(params);
  let pages = docAtCache.get(doc);
  if (!pages) docAtCache.set(doc, (pages = new Map()));
  let page = pages.get(key) as Doc | undefined;
  if (!page) {
    const { _frontmatterAt: at } = doc;
    pages.set(key, (page = createDocAt<Doc>(doc, params, at ? merge(doc, at[key]) : doc)));
  }
  return page;
}

type Props = Record<string, unknown>;

/** the data of compiled exports for props, see {@link defineOutputs} */
function toDocData(
  exports: CompiledMDXProperties & { lastModified?: Date },
  props?: Props,
): DocData {
  return defineOutputs(
    {
      body: bind(exports.default, props),
      _exports: exports as unknown as Record<string, unknown>,
      lastModified: exports.lastModified,
    },
    exports,
    props,
  );
}

/**
 * The page of an entry for props, the path params and custom props: its content and outputs render for them.
 *
 * @param base - the data of the page, which the content and outputs replace
 */
function createDocAt<Doc>(
  // eager entries have the exports, lazy entries load them
  doc: Pick<DocMethods, 'info'> & { _exports?: unknown; _content?: Content },
  props: Props | undefined,
  base: object,
): Doc {
  const { info, _content: content } = doc;
  if (!content) {
    const exports = doc._exports as CompiledMDXProperties;
    return merge(
      base,
      toDocData(exports, props),
      createDocMethods(info, () => exports, props),
    );
  }

  let exports: CompiledMDXProperties;
  let loading: Promise<DocData> | undefined;
  // memoized and tracked, it can be called in render
  const load = () => (loading ??= track(content().then((v) => toDocData((exports = v), props))));
  return {
    ...base,
    // reading its processed Markdown loads the page too
    ...createDocMethods(info, () => load().then(() => exports), props),
    _content: content,
    load,
    async structuredData() {
      const { structuredData } = await content();
      return typeof structuredData === 'function'
        ? renderStructuredData(structuredData, props ?? {})
        : structuredData;
    },
    // the entries of the macro render in the browser
    ...('body' in doc && browserMethods(load)),
  } as Doc;
}

function createDocMethods(
  info: FileInfo,
  load: () => CompiledMDXProperties | Promise<CompiledMDXProperties>,
  props?: Props,
): DocMethods {
  return {
    info,
    async getText(type, options) {
      if (type === 'raw') {
        const fs = await import('node:fs/promises');

        return await fs.readFile(info.fullPath, 'utf-8');
      }

      const { _markdown: markdown } = await load();
      if (typeof markdown === 'string') return markdown;
      if (markdown) {
        const { renderToMarkdown } = await import('fumadocs-core/server');
        // the components of the page props, unless passed here
        return renderToMarkdown(
          createElement(
            markdown,
            options?.components ? { ...props, components: options.components } : props,
          ),
        );
      }

      throw new Error(
        "getText('processed') requires `includeProcessedMarkdown` to be enabled in your collection config.",
      );
    },
    async getMDAST() {
      const { _mdast: mdast } = await load();

      if (!mdast)
        throw new Error(
          'getMDAST() requires `includeMDAST` to be enabled in your collection config.',
        );
      return JSON.parse(mdast);
    },
  };
}
