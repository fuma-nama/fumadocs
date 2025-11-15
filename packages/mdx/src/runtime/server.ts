import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';
import * as path from 'node:path';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { MDXContent } from 'mdx/types';
import type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
import type { Root } from 'mdast';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';

export interface FileInfo {
  /**
   * virtualized path for Source API
   */
  path: string;

  /**
   * the file path in file system
   */
  fullPath: string;
}

export interface DocData {
  /**
   * Compiled MDX content (as component)
   */
  body: MDXContent;

  /**
   * table of contents generated from content.
   */
  toc: TOCItemType[];

  /**
   * structured data for document search indexing.
   */
  structuredData: StructuredData;

  /**
   * Raw exports from the compiled MDX file.
   */
  _exports: Record<string, unknown>;

  /**
   * Last modified date of document file, obtained from version control.
   *
   * Added by the `last-modified` plugin.
   */
  lastModified?: Date;

  /**
   * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
   */
  extractedReferences?: ExtractedReference[];
}

export interface DocMethods {
  /**
   * file info
   */
  info: FileInfo;

  /**
   * get document as text.
   *
   * - `type: raw` - read the original content from file system.
   * - `type: processed` - get the processed Markdown content, only available when `includeProcessedMarkdown` is enabled on collection config.
   */
  getText: (type: 'raw' | 'processed') => Promise<string>;

  getMDAST: () => Promise<Root>;
}

export interface MetaMethods {
  /**
   * file info
   */
  info: FileInfo;
}

export type MetaCollectionEntry<Data> = Data & MetaMethods;

export type DocCollectionEntry<Frontmatter> = DocData &
  DocMethods &
  Frontmatter;

export type AsyncDocCollectionEntry<Frontmatter> = DocMethods & {
  load: () => Promise<DocData>;
} & Frontmatter;

export type CompiledMDXFile<Frontmatter> = CompiledMDXProperties<Frontmatter> &
  Record<string, unknown>;

export interface DocsCollectionEntry<
  Frontmatter extends PageData,
  Meta extends MetaData,
> {
  docs: DocCollectionEntry<Frontmatter>[];
  meta: MetaCollectionEntry<Meta>[];
  toFumadocsSource: () => Source<{
    pageData: DocCollectionEntry<Frontmatter>;
    metaData: MetaCollectionEntry<Meta>;
  }>;
}

export interface AsyncDocsCollectionEntry<
  Frontmatter extends PageData,
  Meta extends MetaData,
> {
  docs: AsyncDocCollectionEntry<Frontmatter>[];
  meta: MetaCollectionEntry<Meta>[];
  toFumadocsSource: () => Source<{
    pageData: AsyncDocCollectionEntry<Frontmatter>;
    metaData: MetaCollectionEntry<Meta>;
  }>;
}

type AwaitableGlobEntries<T> = Record<string, T | (() => Promise<T>)>;

export type ServerCreate<Config> = ReturnType<typeof fromConfig<Config>>;

export function fromConfig<Config>() {
  function fileInfo(file: string, base: string): FileInfo {
    if (file.startsWith('./')) {
      file = file.slice(2);
    }

    return {
      path: file,
      fullPath: path.join(base, file),
    };
  }

  function mapDocData(entry: CompiledMDXFile<any>): DocData {
    return {
      body: entry.default,
      toc: entry.toc,
      extractedReferences: entry.extractedReferences,
      structuredData: entry.structuredData,
      lastModified: entry.lastModified,
      _exports: entry,
    };
  }

  return {
    async doc<Name extends keyof Config>(
      _name: Name,
      base: string,
      glob: AwaitableGlobEntries<unknown>,
    ) {
      const out = await Promise.all(
        Object.entries(glob).map(async ([k, v]) => {
          const data: CompiledMDXFile<unknown> =
            typeof v === 'function' ? await v() : v;

          return {
            ...mapDocData(data),
            ...(data.frontmatter as object),
            ...createDocMethods(fileInfo(k, base), () => data),
          } satisfies DocCollectionEntry<unknown>;
        }),
      );

      return out as unknown as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? DocCollectionEntry<StandardSchemaV1.InferOutput<Schema>>[]
        : never;
    },
    async docLazy<Name extends keyof Config>(
      _name: Name,
      base: string,
      head: AwaitableGlobEntries<unknown>,
      body: Record<string, () => Promise<unknown>>,
    ) {
      const out = await Promise.all(
        Object.entries(head).map(async ([k, v]) => {
          const data = typeof v === 'function' ? await v() : v;
          const content = body[k] as () => Promise<CompiledMDXFile<unknown>>;

          return {
            ...data,
            ...createDocMethods(fileInfo(k, base), content),
            async load() {
              return mapDocData(await content());
            },
          } satisfies AsyncDocCollectionEntry<unknown>;
        }),
      );

      return out as unknown as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? AsyncDocCollectionEntry<StandardSchemaV1.InferOutput<Schema>>[]
        : never;
    },
    async meta<Name extends keyof Config>(
      _name: Name,
      base: string,
      glob: AwaitableGlobEntries<unknown>,
    ) {
      const out = await Promise.all(
        Object.entries(glob).map(async ([k, v]) => {
          const data = typeof v === 'function' ? await v() : v;

          return {
            info: fileInfo(k, base),
            ...data,
          } satisfies MetaCollectionEntry<unknown>;
        }),
      );

      return out as unknown as Config[Name] extends
        | MetaCollection<infer Schema>
        | DocsCollection<StandardSchemaV1, infer Schema>
        ? MetaCollectionEntry<StandardSchemaV1.InferOutput<Schema>>[]
        : never;
    },

    async docs<Name extends keyof Config>(
      name: Name,
      base: string,
      metaGlob: AwaitableGlobEntries<unknown>,
      docGlob: AwaitableGlobEntries<unknown>,
    ) {
      const entry = {
        docs: await this.doc(name, base, docGlob),
        meta: await this.meta(name, base, metaGlob),
        toFumadocsSource() {
          return toFumadocsSource(this.docs, this.meta);
        },
      } satisfies DocsCollectionEntry<PageData, MetaData>;

      return entry as Config[Name] extends DocsCollection<
        infer Page,
        infer Meta
      >
        ? StandardSchemaV1.InferOutput<Page> extends PageData
          ? StandardSchemaV1.InferOutput<Meta> extends MetaData
            ? DocsCollectionEntry<
                StandardSchemaV1.InferOutput<Page>,
                StandardSchemaV1.InferOutput<Meta>
              >
            : never
          : never
        : never;
    },
    async docsLazy<Name extends keyof Config>(
      name: Name,
      base: string,
      metaGlob: AwaitableGlobEntries<unknown>,
      docHeadGlob: AwaitableGlobEntries<unknown>,
      docBodyGlob: Record<string, () => Promise<unknown>>,
    ) {
      const entry = {
        docs: await this.docLazy(name, base, docHeadGlob, docBodyGlob),
        meta: await this.meta(name, base, metaGlob),
        toFumadocsSource() {
          return toFumadocsSource(this.docs, this.meta);
        },
      } satisfies AsyncDocsCollectionEntry<PageData, MetaData>;

      return entry as Config[Name] extends DocsCollection<
        infer Page,
        infer Meta
      >
        ? StandardSchemaV1.InferOutput<Page> extends PageData
          ? StandardSchemaV1.InferOutput<Meta> extends MetaData
            ? AsyncDocsCollectionEntry<
                StandardSchemaV1.InferOutput<Page>,
                StandardSchemaV1.InferOutput<Meta>
              >
            : never
          : never
        : never;
    },
  };
}

export function toFumadocsSource<
  Page extends DocMethods & PageData,
  Meta extends MetaMethods & MetaData,
>(
  pages: Page[],
  metas: Meta[],
): Source<{
  pageData: Page;
  metaData: Meta;
}> {
  const files: VirtualFile<{
    pageData: Page;
    metaData: Meta;
  }>[] = [];

  for (const entry of pages) {
    files.push({
      type: 'page',
      path: entry.info.path,
      absolutePath: entry.info.fullPath,
      data: entry,
    });
  }

  for (const entry of metas) {
    files.push({
      type: 'meta',
      path: entry.info.path,
      absolutePath: entry.info.fullPath,
      data: entry,
    });
  }

  return {
    files,
  };
}

function createDocMethods(
  info: FileInfo,
  load: () => CompiledMDXProperties<any> | Promise<CompiledMDXProperties<any>>,
): DocMethods {
  return {
    info,
    async getText(type) {
      if (type === 'raw') {
        const fs = await import('node:fs/promises');

        return (await fs.readFile(info.fullPath)).toString();
      }

      const data = await load();
      if (typeof data._markdown !== 'string')
        throw new Error(
          "getText('processed') requires `includeProcessedMarkdown` to be enabled in your collection config.",
        );
      return data._markdown;
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
