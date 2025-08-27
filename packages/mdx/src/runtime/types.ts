import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MetaData, PageData, Source } from 'fumadocs-core/source';
import type { LoadedConfig } from '@/utils/config';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { CompiledMDXProperties } from '@/utils/build-mdx';

export interface BaseCollectionEntry {
  /**
   * Raw file path of collection entry, including absolute path (not normalized).
   */
  _file: FileInfo;
}

export interface FileInfo {
  path: string;
  absolutePath: string;
}

interface MarkdownProps
  extends Omit<CompiledMDXProperties, 'frontmatter' | 'default'> {
  body: CompiledMDXProperties['default'];
}

export interface RuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
}

export interface AsyncRuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
  content: { matter: string; body: string };
  lastModified?: Date;
}

type DocOut<Schema extends StandardSchemaV1> = Override<
  MarkdownProps & {
    /**
     * Other exports in the compiled Markdown/MDX file
     */
    _exports: Record<string, unknown>;

    /**
     * Read the original content of file from file system.
     */
    get content(): string;
  },
  StandardSchemaV1.InferOutput<Schema> & BaseCollectionEntry
>;

type Override<A, B> = Omit<A, keyof B> & B;

type MetaOut<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<Schema> & BaseCollectionEntry;

export interface Runtime {
  doc: <C>(
    files: RuntimeFile[],
  ) => C extends DocCollection<infer Schema, false> ? DocOut<Schema>[] : never;
  meta: <C>(
    files: RuntimeFile[],
  ) => C extends MetaCollection<infer Schema> ? MetaOut<Schema>[] : never;
  docs: <C>(
    docs: RuntimeFile[],
    metas: RuntimeFile[],
  ) => C extends DocsCollection<infer DocSchema, infer MetaSchema, false>
    ? {
        docs: DocOut<DocSchema>[];
        meta: MetaOut<MetaSchema>[];

        toFumadocsSource: () => Source<{
          pageData: DocOut<DocSchema> extends PageData
            ? DocOut<DocSchema>
            : never;
          metaData: MetaOut<MetaSchema> extends MetaData
            ? MetaOut<MetaSchema>
            : never;
        }>;
      }
    : never;
}

type AsyncDocOut<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<Schema> &
    BaseCollectionEntry & {
      content: string;
      load: () => Promise<MarkdownProps & Record<string, unknown>>;
    };

export interface RuntimeAsync {
  doc: <C>(
    files: AsyncRuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => C extends DocCollection<infer Schema, true>
    ? AsyncDocOut<Schema>[]
    : never;
  docs: <C>(
    docs: AsyncRuntimeFile[],
    metas: RuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => C extends DocsCollection<infer DocSchema, infer MetaSchema, true>
    ? {
        docs: AsyncDocOut<DocSchema>[];
        meta: MetaOut<MetaSchema>[];
        toFumadocsSource: () => Source<{
          pageData: AsyncDocOut<DocSchema> extends PageData
            ? AsyncDocOut<DocSchema>
            : never;
          metaData: MetaOut<MetaSchema> extends MetaData
            ? MetaOut<MetaSchema>
            : never;
        }>;
      }
    : never;
}
