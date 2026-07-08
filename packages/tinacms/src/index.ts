import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { DynamicSource, MetaData, VirtualFile } from 'fumadocs-core/source';
import type { TOCItemType } from 'fumadocs-core/toc';
import type { ReactNode } from 'react';
import path from 'node:path';
import {
  extractStructuredData,
  extractToc,
  renderToc,
  type RichTextNode,
  type RichTextRoot,
} from './client';

export type TinaCMSOptions<Doc extends BaseDoc = BaseDoc> =
  | GenericTinaCMSOptions<Doc>
  | CustomFetchTinaCMSOptions<Doc>;

interface BaseTinaCMSOptions<Doc extends BaseDoc> {
  /** collection name for docs pages */
  collection: string;

  /**
   * name of the rich-text body field, it is excluded from page data.
   *
   * @defaultValue 'body'
   */
  bodyField?: string;

  /** generate [virtual file path](https://fumadocs.dev/docs/headless/source-api/source#static-source) from document, defaults to its `relativePath` */
  generatePath?: (doc: ShallowDoc<Doc>) => string;

  /** base directory for the virtual file paths */
  baseDir?: string;
}

/** structural subset of `TinaClient` from `tinacms/dist/client`, compatible with your generated client */
export interface TinaCMSClient {
  request(
    args: { query: string; variables?: Record<string, unknown> },
    options?: { fetchOptions?: RequestInit },
  ): Promise<{ data: unknown }>;
}

export interface GenericTinaCMSOptions<
  Doc extends BaseDoc = BaseDoc,
> extends BaseTinaCMSOptions<Doc> {
  client: TinaCMSClient;
}

export interface CustomFetchTinaCMSOptions<
  Doc extends BaseDoc = BaseDoc,
> extends BaseTinaCMSOptions<Doc> {
  /** query the TinaCMS GraphQL content API yourself, e.g. for self-hosted setups */
  tinaFetch: <R = unknown>(query: string, variables?: Record<string, unknown>) => Promise<R>;
}

/** your document type must align with this type */
export interface BaseDoc {
  title?: string | null;
  description?: string | null;
  /** rich-text content */
  body?: unknown;
}

/** the `_sys` info of TinaCMS documents */
export interface DocumentSys {
  filename: string;
  basename: string;
  extension: string;
  path: string;
  relativePath: string;
  breadcrumbs: string[];
}

export type ShallowDoc<Doc extends BaseDoc> = Omit<Doc, 'body'> & {
  id: string;
  _sys: DocumentSys;
};

export type DocToPage<Doc extends BaseDoc> = ShallowDoc<Doc> & {
  title: string;
  description?: string | undefined;
  load: () => Promise<DocToPageLoaded<Doc>>;
  structuredData: () => Promise<StructuredData>;
};

export type DocToPageLoaded<Doc extends BaseDoc> = Doc & {
  id: string;
  _sys: DocumentSys;
  _toc: RichTextNode[];
  renderToc: (opts: { render: (node: RichTextRoot) => ReactNode }) => TOCItemType[];
};

interface DocumentResult {
  id: string;
  _sys: DocumentSys;
  _values: Record<string, unknown>;
}

const sysFields = 'filename basename extension path relativePath breadcrumbs';

const listQuery = `query FumadocsListDocs($collection: String!, $first: Float, $after: String) {
  collection(collection: $collection) {
    documents(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          ... on Document {
            id
            _sys { ${sysFields} }
            _values
          }
        }
      }
    }
  }
}`;

const docQuery = `query FumadocsGetDoc($collection: String!, $relativePath: String!) {
  document(collection: $collection, relativePath: $relativePath) {
    ... on Document {
      id
      _sys { ${sysFields} }
      _values
    }
  }
}`;

export function createTinaCMSSource<Doc extends BaseDoc>(
  options: TinaCMSOptions<Doc>,
): DynamicSource<{
  pageData: DocToPage<Doc>;
  metaData: MetaData;
}> {
  const { collection, bodyField = 'body', baseDir, generatePath } = options;
  let tinaFetch: <R = unknown>(query: string, variables?: Record<string, unknown>) => Promise<R>;

  if ('tinaFetch' in options) {
    tinaFetch = options.tinaFetch;
  } else {
    const client = options.client;
    tinaFetch = async (query, variables) => {
      const res = await client.request({ query, variables }, {});
      return res.data as never;
    };
  }

  function toPage(doc: DocumentResult): DocToPage<Doc> {
    const { [bodyField]: body, ...values } = doc._values;
    const shallow = {
      ...values,
      id: doc.id,
      _sys: doc._sys,
    } as ShallowDoc<Doc>;

    return {
      ...shallow,
      title: typeof values.title === 'string' ? values.title : doc._sys.filename,
      description: typeof values.description === 'string' ? values.description : undefined,
      async load() {
        const res = await tinaFetch<{ document: DocumentResult }>(docQuery, {
          collection,
          relativePath: doc._sys.relativePath,
        });
        const loaded = res.document;
        const toc = extractToc(loaded._values[bodyField]);

        return {
          ...(loaded._values as unknown as Doc),
          id: loaded.id,
          _sys: loaded._sys,
          _toc: toc,
          renderToc(opts) {
            return renderToc({ toc, ...opts });
          },
        };
      },
      async structuredData() {
        return extractStructuredData(body);
      },
    };
  }

  return {
    async files() {
      const files: VirtualFile<{
        pageData: DocToPage<Doc>;
        metaData: MetaData;
      }>[] = [];
      let after: string | null = null;
      let hasNextPage = true;

      while (hasNextPage) {
        const res: {
          collection: {
            documents: {
              pageInfo: { hasNextPage: boolean; endCursor: string };
              edges: ({ node?: Partial<DocumentResult> | null } | null)[];
            };
          };
        } = await tinaFetch(listQuery, {
          collection,
          first: 50,
          after,
        });
        const documents = res.collection.documents;

        for (const edge of documents.edges) {
          const node = edge?.node;
          // skip non-document nodes (e.g. folders)
          if (!node || !node._sys || !node.id || !node._values) continue;

          const page = toPage(node as DocumentResult);
          let filePath = generatePath ? generatePath(page) : node._sys.relativePath;
          if (baseDir) filePath = path.join(baseDir, filePath);

          files.push({
            type: 'page',
            path: filePath,
            data: page,
          });
        }

        hasNextPage = documents.pageInfo.hasNextPage;
        after = documents.pageInfo.endCursor;
      }

      return files;
    },
  };
}
