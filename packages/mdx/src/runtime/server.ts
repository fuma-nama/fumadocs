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
   * Only available when `lastModifiedTime` is enabled on global config.
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

  function mapPageData<Frontmatter>(
    info: FileInfo,
    entry: CompiledMDXFile<Frontmatter>,
  ): DocCollectionEntry<Frontmatter> {
    return {
      ...mapDocData(entry),
      ...entry.frontmatter,
      ...createDocMethods(info, () => entry),
    };
  }

  function mapPageDataLazy<Frontmatter>(
    info: FileInfo,
    head: Frontmatter,
    content: () => Promise<CompiledMDXFile<Frontmatter>>,
  ): AsyncDocCollectionEntry<Frontmatter> {
    return {
      ...head,
      ...createDocMethods(info, content),
      async load() {
        return mapDocData(await content());
      },
    };
  }

  function mapMetaData<Data>(
    info: FileInfo,
    content: Data,
  ): MetaCollectionEntry<Data> {
    return {
      info,
      ...content,
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
          const data = typeof v === 'function' ? await v() : v;

          return mapPageData(fileInfo(k, base), data);
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

          return mapPageDataLazy(fileInfo(k, base), data, content);
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

          return mapMetaData(fileInfo(k, base), data);
        }),
      );

      return out as unknown as Config[Name] extends
        | MetaCollection<infer Schema>
        | DocsCollection<StandardSchemaV1, infer Schema>
        ? MetaCollectionEntry<StandardSchemaV1.InferOutput<Schema>>[]
        : never;
    },

    async sourceAsync<DocOut extends PageData, MetaOut extends MetaData>(
      doc: DocCollectionEntry<DocOut>[],
      meta: MetaCollectionEntry<MetaOut>[],
    ): Promise<
      Source<{
        pageData: DocCollectionEntry<DocOut>;
        metaData: MetaCollectionEntry<MetaOut>;
      }>
    > {
      const files: VirtualFile<{
        pageData: DocCollectionEntry<DocOut>;
        metaData: MetaCollectionEntry<MetaOut>;
      }>[] = [];

      for (const entry of doc) {
        files.push({
          type: 'page',
          path: entry.info.path,
          absolutePath: entry.info.fullPath,
          data: entry,
        });
      }

      for (const entry of meta) {
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
    },
    async sourceLazy<DocOut extends PageData, MetaOut extends MetaData>(
      doc: AsyncDocCollectionEntry<DocOut>[],
      meta: MetaCollectionEntry<MetaOut>[],
    ): Promise<
      Source<{
        pageData: AsyncDocCollectionEntry<DocOut>;
        metaData: MetaCollectionEntry<MetaOut>;
      }>
    > {
      return this.sourceAsync(doc as any, meta);
    },
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
