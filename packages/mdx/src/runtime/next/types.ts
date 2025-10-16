import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MetaData, PageData, Source } from 'fumadocs-core/source';
import type { LoadedConfig } from '@/loaders/config';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type {
  AsyncDocCollectionEntry,
  DocCollectionEntry,
  FileInfo,
  MetaCollectionEntry,
} from '@/runtime/shared';

export interface RuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
}

export interface AsyncRuntimeFile {
  info: FileInfo & { hash?: string; absolutePath?: string };
  data: Record<string, unknown>;
  lastModified?: Date;
}

export type DocOut<Schema extends StandardSchemaV1 = StandardSchemaV1> =
  DocCollectionEntry<StandardSchemaV1.InferOutput<Schema>>;

export type MetaOut<Schema extends StandardSchemaV1 = StandardSchemaV1> =
  MetaCollectionEntry<StandardSchemaV1.InferOutput<Schema>>;

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

export type AsyncDocOut<Schema extends StandardSchemaV1 = StandardSchemaV1> =
  AsyncDocCollectionEntry<StandardSchemaV1.InferOutput<Schema>>;

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
