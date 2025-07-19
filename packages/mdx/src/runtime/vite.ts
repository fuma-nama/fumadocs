import type { TableOfContents } from 'fumadocs-core/server';
import { type FC, lazy, type LazyExoticComponent, type ReactNode } from 'react';
import type { MDXProps } from 'mdx/types';
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import type { DocCollection, DocsCollection, MetaCollection } from '@/config';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type {
  MetaData,
  PageData,
  Source,
  VirtualFile,
} from 'fumadocs-core/source';

export type CompiledMDXFile<Frontmatter> = {
  frontmatter: Frontmatter;
  toc: TableOfContents;
  default: FC<MDXProps>;
  structuredData: StructuredData;
} & Record<string, unknown>;

type MDXFileToPageData<Frontmatter> = Frontmatter & {
  toc: TableOfContents;
  default: FC<MDXProps>;
  structuredData: StructuredData;
  _exports: Record<string, unknown>;
};

type AttachGlobValue<GlobValue, Attach> =
  GlobValue extends () => Promise<unknown> ? () => Promise<Attach> : Attach;

export function fromConfig<Config>(): {
  doc: <Name extends keyof Config, GlobValue>(
    name: Name,
    glob: Record<string, GlobValue>,
  ) => Config[Name] extends DocCollection<infer Schema>
    ? Record<
        string,
        AttachGlobValue<
          GlobValue,
          CompiledMDXFile<StandardSchemaV1.InferOutput<Schema>>
        >
      >
    : never;

  meta: <Name extends keyof Config, GlobValue>(
    name: Name,
    glob: Record<string, GlobValue>,
  ) => Config[Name] extends MetaCollection<infer Schema>
    ? AttachGlobValue<GlobValue, StandardSchemaV1.InferOutput<Schema>>
    : never;

  docs: <Name extends keyof Config, DocGlobValue, MetaGlobValue>(
    name: Name,
    options: {
      meta: Record<string, MetaGlobValue>;
      doc: Record<string, DocGlobValue>;
    },
  ) => Config[Name] extends DocsCollection<infer DocSchema, infer MetaSchema>
    ? {
        doc: Record<
          string,
          AttachGlobValue<
            DocGlobValue,
            CompiledMDXFile<StandardSchemaV1.InferOutput<DocSchema>>
          >
        >;
        meta: Record<
          string,
          AttachGlobValue<
            MetaGlobValue,
            StandardSchemaV1.InferOutput<MetaSchema>
          >
        >;
      }
    : never;
  source: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: Record<string, CompiledMDXFile<DocOut>>,
    meta: Record<string, MetaOut>,
  ) => Source<{
    pageData: MDXFileToPageData<DocOut>;
    metaData: MetaOut;
  }>;

  sourceAsync: <DocOut extends PageData, MetaOut extends MetaData>(
    doc: Record<string, () => Promise<CompiledMDXFile<DocOut>>>,
    meta: Record<string, () => Promise<MetaOut>>,
  ) => Promise<
    Source<{
      pageData: MDXFileToPageData<DocOut>;
      metaData: MetaOut;
    }>
  >;
} {
  function normalize(entries: Record<string, unknown>) {
    const out: Record<string, unknown> = {};
    for (const k in entries) {
      const mappedK = k.startsWith('./') ? k.slice(2) : k;
      out[mappedK] = entries[k];
    }
    return out;
  }

  function mapPageData<Frontmatter>(
    entry: CompiledMDXFile<Frontmatter>,
  ): MDXFileToPageData<Frontmatter> {
    const { toc, structuredData } = entry;

    return {
      ...entry.frontmatter,
      default: entry.default,
      toc,
      structuredData,
      _exports: entry,
    };
  }

  return {
    doc(_, glob) {
      return normalize(glob) as any;
    },
    meta(_, glob) {
      return normalize(glob) as any;
    },
    docs(_, { doc, meta }) {
      return {
        doc: normalize(doc),
        meta: normalize(meta),
      } as any;
    },
    source(doc, meta) {
      const virtualFiles: VirtualFile[] = [];
      for (const [file, content] of Object.entries(doc)) {
        virtualFiles.push({
          type: 'page',
          path: file,
          data: mapPageData(content),
        });
      }

      for (const [file, content] of Object.entries(meta)) {
        virtualFiles.push({
          type: 'meta',
          path: file,
          data: content,
        });
      }

      return {
        files: virtualFiles,
      };
    },
    async sourceAsync(doc, meta) {
      const virtualFiles: VirtualFile[] = [];

      for (const [file, content] of Object.entries(doc)) {
        virtualFiles.push({
          type: 'page',
          path: file,
          data: mapPageData(await content()),
        });
      }

      for (const [file, content] of Object.entries(meta)) {
        virtualFiles.push({
          type: 'meta',
          path: file,
          data: await content(),
        });
      }

      return {
        files: virtualFiles,
      };
    },
  };
}

type ClientLoader<Props> = Record<
  string,
  LazyExoticComponent<(props: Props) => ReactNode>
>;

export function toClientRenderer<Frontmatter, Props extends object = object>(
  files: Record<string, () => Promise<CompiledMDXFile<Frontmatter>>>,
  renderer: (loaded: CompiledMDXFile<Frontmatter>, props: Props) => ReactNode,
): ClientLoader<Props> {
  const loader: ClientLoader<Props> = {};

  for (const k in files) {
    loader[k] = lazy(async () => {
      const loaded = await files[k]();

      return { default: (props) => renderer(loaded, props) };
    });
  }

  return loader;
}
