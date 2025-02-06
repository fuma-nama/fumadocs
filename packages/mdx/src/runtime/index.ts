import {
  type MetaData,
  type PageData,
  type Source,
} from 'fumadocs-core/source';
import {
  type BaseCollectionEntry,
  type defineCollections,
  type FileInfo,
  type MarkdownProps,
} from '@/config';
import type { VirtualFile } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';

export interface RuntimeFile {
  info: FileInfo;
  data: Record<string, unknown>;
}

export interface Runtime {
  doc: <C>(
    files: RuntimeFile[],
  ) => C extends ReturnType<
    typeof defineCollections<
      'doc',
      infer Schema extends StandardSchemaV1,
      false
    >
  >
    ? (Omit<MarkdownProps, keyof StandardSchemaV1.InferOutput<Schema>> &
        StandardSchemaV1.InferOutput<Schema> &
        BaseCollectionEntry)[]
    : never;
  meta: <C>(
    files: RuntimeFile[],
  ) => C extends ReturnType<
    typeof defineCollections<
      'meta',
      infer Schema extends StandardSchemaV1,
      false
    >
  >
    ? (StandardSchemaV1.InferOutput<Schema> & BaseCollectionEntry)[]
    : never;
  docs: <Docs>(
    docs: RuntimeFile[],
    metas: RuntimeFile[],
  ) => Docs extends {
    type: 'docs';
    docs: unknown;
    meta: unknown;
  }
    ? {
        docs: ReturnType<typeof _runtime.doc<Docs['docs']>>;
        meta: ReturnType<typeof _runtime.meta<Docs['meta']>>;
        toFumadocsSource: () => Source<{
          pageData: ReturnType<
            typeof _runtime.doc<Docs['docs']>
          >[number] extends PageData & BaseCollectionEntry
            ? ReturnType<typeof _runtime.doc<Docs['docs']>>[number]
            : never;
          metaData: ReturnType<
            typeof _runtime.meta<Docs['meta']>
          >[number] extends MetaData & BaseCollectionEntry
            ? ReturnType<typeof _runtime.meta<Docs['meta']>>[number]
            : never;
        }>;
      }
    : never;
}

export const _runtime: Runtime = {
  doc(files) {
    return files.map((file) => {
      const { default: body, frontmatter, ...exports } = file.data;

      return {
        body,
        ...exports,
        ...(frontmatter as object),
        _exports: file.data,
        _file: file.info,
      };
    }) as any;
  },
  meta(files) {
    return files.map((file) => {
      return {
        ...(file.data.default as object),
        _file: file.info,
      };
    }) as any;
  },
  docs(docs, metas) {
    const parsedDocs = this.doc(docs);
    const parsedMetas = this.meta(metas);

    return {
      docs: parsedDocs,
      meta: parsedMetas,
      toFumadocsSource() {
        return createMDXSource(parsedDocs, parsedMetas);
      },
    } as any;
  },
};

export function createMDXSource<
  Doc extends PageData & BaseCollectionEntry,
  Meta extends MetaData & BaseCollectionEntry,
>(
  docs: Doc[],
  meta: Meta[] = [],
): Source<{
  pageData: Doc;
  metaData: Meta;
}> {
  return {
    files: (rootDir) =>
      resolveFiles({
        docs,
        meta,
        rootDir,
      }),
  };
}

interface ResolveOptions {
  docs: BaseCollectionEntry[];
  meta: BaseCollectionEntry[];

  rootDir?: string;
}

export function resolveFiles({
  docs,
  meta,
  rootDir = '',
}: ResolveOptions): VirtualFile[] {
  const outputs: VirtualFile[] = [];

  for (const entry of docs) {
    if (!entry._file.path.startsWith(rootDir)) continue;

    outputs.push({
      type: 'page',
      path: entry._file.path,
      data: entry,
    });
  }

  for (const entry of meta) {
    outputs.push({
      type: 'meta',
      path: entry._file.path,
      data: entry,
    });
  }

  return outputs;
}
