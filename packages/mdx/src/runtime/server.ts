import type { MetaData, PageData, Source, VirtualFile } from 'fumadocs-core/source';
import * as path from 'node:path';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { CompiledMDXProperties } from '@/loaders/mdx/build-mdx';
import type { InternalTypeConfig, DocData, DocMethods, FileInfo, MetaMethods } from './types';

export type MetaCollectionEntry<Data> = Data & MetaMethods;

export type DocCollectionEntry<
  Name extends string = string,
  Frontmatter = unknown,
  TC extends InternalTypeConfig = InternalTypeConfig,
> = DocData & DocMethods & Frontmatter & TC['DocData'][Name];

export type AsyncDocCollectionEntry<
  Name extends string = string,
  Frontmatter = unknown,
  TC extends InternalTypeConfig = InternalTypeConfig,
> = {
  load: () => Promise<DocData & TC['DocData'][Name]>;
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
  toFumadocsSource: () => Source<{
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
  toFumadocsSource: () => Source<{
    pageData: AsyncDocCollectionEntry<Name, Frontmatter, TC>;
    metaData: MetaCollectionEntry<Meta>;
  }>;
}

type AwaitableGlobEntries<T> = Record<string, T | (() => Promise<T>)>;

export type ServerCreate<Config, TC extends InternalTypeConfig = InternalTypeConfig> = ReturnType<
  typeof server<Config, TC>
>;

export interface ServerOptions {
  doc?: {
    passthroughs?: string[];
  };
}

export function server<Config, TC extends InternalTypeConfig>(options: ServerOptions = {}) {
  const { doc: { passthroughs: docPassthroughs = [] } = {} } = options;

  function fileInfo(file: string, base: string): FileInfo {
    if (file.startsWith('./')) {
      file = file.slice(2);
    }

    return {
      path: file,
      fullPath: path.join(base, file),
    };
  }

  function mapDocData(entry: CompiledMDXProperties): DocData {
    const data: DocData = {
      body: entry.default,
      toc: entry.toc,
      structuredData: entry.structuredData,
      _exports: entry as unknown as Record<string, unknown>,
    };

    for (const key of docPassthroughs) {
      // @ts-expect-error -- handle passthrough properties
      data[key] = entry[key];
    }

    return data;
  }

  return {
    async doc<Name extends keyof Config & string>(
      _name: Name,
      base: string,
      glob: AwaitableGlobEntries<unknown>,
    ) {
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

      return out as unknown as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? DocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>[]
        : never;
    },
    async docLazy<Name extends keyof Config & string>(
      _name: Name,
      base: string,
      head: AwaitableGlobEntries<unknown>,
      body: Record<string, () => Promise<unknown>>,
    ) {
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
          } satisfies AsyncDocCollectionEntry;
        }),
      );

      return out as unknown as Config[Name] extends
        | DocCollection<infer Schema>
        | DocsCollection<infer Schema>
        ? AsyncDocCollectionEntry<Name, StandardSchemaV1.InferOutput<Schema>, TC>[]
        : never;
    },
    async meta<Name extends keyof Config & string>(
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

    async docs<Name extends keyof Config & string>(
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
      } satisfies DocsCollectionEntry;

      return entry as Config[Name] extends DocsCollection<infer Page, infer Meta>
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
        : never;
    },
    async docsLazy<Name extends keyof Config & string>(
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
      } satisfies AsyncDocsCollectionEntry;

      return entry as Config[Name] extends DocsCollection<infer Page, infer Meta>
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
  load: () => CompiledMDXProperties | Promise<CompiledMDXProperties>,
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
