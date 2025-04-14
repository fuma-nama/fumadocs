import type { BaseCollectionEntry, FileInfo, MarkdownProps } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MetaData, PageData, Source } from 'fumadocs-core/source';
import type { LoadedConfig } from '@/utils/config';

export interface RuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
}

export interface AsyncRuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
  content: string;
}

type DocOut<Schema extends StandardSchemaV1> = Omit<
  MarkdownProps,
  keyof StandardSchemaV1.InferOutput<Schema>
> &
  StandardSchemaV1.InferOutput<Schema> &
  BaseCollectionEntry;

type MetaOut<Schema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<Schema> & BaseCollectionEntry;

export interface Runtime {
  doc: <C>(files: RuntimeFile[]) => C extends {
    type: 'doc';
    _type: {
      schema: infer Schema extends StandardSchemaV1;
    };
  }
    ? DocOut<Schema>[]
    : never;
  meta: <C>(files: RuntimeFile[]) => C extends {
    type: 'meta';

    _type: {
      schema: infer Schema extends StandardSchemaV1;
    };
  }
    ? MetaOut<Schema>[]
    : never;
  docs: <C>(
    docs: RuntimeFile[],
    metas: RuntimeFile[],
  ) => C extends {
    type: 'docs';

    docs: {
      type: 'doc';
      _type: {
        schema: infer DocSchema extends StandardSchemaV1;
      };
    };

    meta: {
      type: 'meta';
      _type: {
        schema: infer MetaSchema extends StandardSchemaV1;
      };
    };
  }
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
      load: () => Promise<MarkdownProps>;
    };

export interface RuntimeAsync {
  doc: <C>(
    files: AsyncRuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => C extends {
    type: 'doc';
    _type: {
      schema: infer Schema extends StandardSchemaV1;
    };
  }
    ? AsyncDocOut<Schema>[]
    : never;
  docs: <C>(
    docs: AsyncRuntimeFile[],
    metas: RuntimeFile[],
    collection: string,
    config: LoadedConfig,
  ) => C extends {
    type: 'docs';

    docs: {
      type: 'doc';
      _type: {
        schema: infer DocSchema extends StandardSchemaV1;
      };
    };

    meta: {
      type: 'meta';
      _type: {
        schema: infer MetaSchema extends StandardSchemaV1;
      };
    };
  }
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
