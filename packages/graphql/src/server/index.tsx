import path from 'node:path';
import {
  type DynamicSource,
  type LoaderPlugin,
  type MetaData,
  PathUtils,
  type PageData,
  type Source,
  type VirtualFile,
  type LoaderOutput,
} from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { loadSchema, type GraphQLSchemaInput, type LoadedSchema } from '@/utils/load-schema';
import type { Awaitable } from '@/types';
import {
  getPageProps,
  GraphQLPageItem,
  schemaToPages,
  type OperationOutput,
  type OutputEntry,
  type PageOutput,
  type SchemaToPagesOptions,
  type TypeOutput,
} from '@/utils/pages';
import type { GraphQLLinks, GraphQLPageProps } from '@/utils/create-page';
import { toStaticData } from '@/utils/to-static-data';
import { toMarkdown } from '@/utils/to-markdown';
import { loadExamples, type OperationExamples } from '@/utils/examples';
import type { NamedTypeKind, OperationKind } from '@/utils/schema';
import { KindLabel } from '@/ui/components/badge';

type SchemaRecord = Record<string, GraphQLSchemaInput | (() => Awaitable<GraphQLSchemaInput>)>;

export interface GraphQLOptions {
  /**
   * schema inputs:
   *
   * - an array of file paths/URLs to SDL files.
   * - a record of schema id -> input (file paths/URLs, SDL text, introspection results, or `GraphQLSchema` instances).
   */
  input?: string[] | SchemaRecord;
  /**
   * GraphQL documents of example operations: file paths/URLs, or GraphQL text.
   * Each named operation becomes an example of the root fields it selects.
   * A record maps schema ids to their documents, an array applies to every schema.
   */
  examples?: string[] | Record<string, string[]>;
  disableCache?: boolean;
}

export type { GraphQLPageProps };

export interface GraphQLServer {
  getSchemas: () => Promise<Record<string, LoadedSchema>>;
  getSchema: (document: string) => Promise<LoadedSchema>;
  readonly options: GraphQLOptions;
  staticSource: (
    options?: GraphQLSourceOptions,
  ) => Promise<Source<{ metaData: MetaData; pageData: GraphQLPageData }>>;
  dynamicSource: (
    options?: GraphQLSourceOptions,
  ) => DynamicSource<{ metaData: MetaData; pageData: GraphQLPageData }>;
  loaderPlugin: () => LoaderPlugin;
}

export interface GraphQLPageData extends PageData {
  getGraphQLPageProps: () => GraphQLPageProps;
  getSchema: () => { id: string } & LoadedSchema;
  /** the items of page in Markdown, for LLMs */
  getText: (type: 'raw' | 'processed') => Promise<string>;
  structuredData: StructuredData;
  toc: TOCItemType[];
  _graphql: InternalGraphQLMeta;
}

export type GraphQLSourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createGraphQL(options: GraphQLOptions = {}): GraphQLServer {
  const { disableCache = false } = options;
  const docCache = new Map<string, Promise<LoadedSchema>>();
  let exampleCache: Promise<Record<string, OperationExamples>> | undefined;
  type GraphQLVirtualFile = VirtualFile<{
    pageData: GraphQLPageData;
    metaData: MetaData;
  }>;

  let resolvedInput: SchemaRecord = {};
  if (Array.isArray(options.input)) {
    for (const item of options.input) resolvedInput[item] = item;
  } else if (options.input) {
    resolvedInput = options.input;
  }

  async function getSchema(schemaId: string): Promise<LoadedSchema> {
    if (!Object.hasOwn(resolvedInput, schemaId)) {
      throw new Error(
        `[Fumadocs GraphQL] the schema "${schemaId}" is not listed in "input", only schemas from "input" can be loaded.`,
      );
    }

    if (!disableCache) {
      const cached = docCache.get(schemaId);
      if (cached) return cached;
    }

    const raw = resolvedInput[schemaId];
    const output = Promise.resolve(typeof raw === 'function' ? raw() : raw).then(loadSchema);
    if (!disableCache) docCache.set(schemaId, output);
    return output;
  }

  async function getSchemas(): Promise<Record<string, LoadedSchema>> {
    const entries = await Promise.all(
      Object.keys(resolvedInput).map(async (k) => [k, await getSchema(k)]),
    );
    return Object.fromEntries(entries);
  }

  // documents of an array apply to every schema, they are matched with all schemas at once
  function getExamples(
    schemas: Record<string, LoadedSchema>,
  ): Promise<Record<string, OperationExamples>> {
    let output = disableCache ? undefined : exampleCache;
    if (!output) {
      output = loadExamples(options.examples ?? [], schemas);
      if (!disableCache) exampleCache = output;
    }

    return output;
  }

  function generateLinks(loader: LoaderOutput, locale?: string): GraphQLLinks {
    const out: GraphQLLinks = { types: {}, operations: {} };

    for (const page of loader.getPages(locale)) {
      if (
        !('_graphql' in page.data) ||
        !page.data._graphql ||
        typeof page.data._graphql !== 'object'
      )
        continue;
      const meta = page.data._graphql as InternalGraphQLMeta;

      for (const item of meta.items ?? []) {
        if (item.type === 'operation') {
          out.operations[`${item.kind}:${item.name}`] = page.url;
        } else {
          out.types[item.name] = page.url;
        }
      }
    }
    return out;
  }

  async function getVirtualFiles(
    options: GraphQLSourceOptions,
    getLinks: () => GraphQLLinks | undefined,
    docFilesCache?: WeakMap<LoadedSchema, GraphQLVirtualFile[]>,
  ): Promise<GraphQLVirtualFile[]> {
    const { baseDir = '', meta = false } = options;
    const files: GraphQLVirtualFile[] = [];

    const schemas = await getSchemas();
    const examples = await getExamples(schemas);

    for (const [id, schema] of Object.entries(schemas)) {
      const cached = docFilesCache?.get(schema);
      if (cached) {
        files.push(...cached);
        continue;
      }

      const entries = onEntries(schemaToPages(id, schema.schema, options));
      docFilesCache?.set(schema, entries);
      files.push(...entries);

      function onEntry(entry: OperationOutput | TypeOutput | PageOutput): GraphQLVirtualFile {
        const props = getPageProps(entry);
        const filePath = `${baseDir}/${entry.path}`;
        let pageExamples: OperationExamples | undefined;
        for (const item of props.items ?? []) {
          if (item.type !== 'operation') continue;
          const key = `${item.kind}:${item.name}`;
          const list = examples[id][key];
          if (list) (pageExamples ??= {})[key] = list;
        }

        return {
          type: 'page',
          path: filePath,
          data: {
            ...entry.info,
            getGraphQLPageProps() {
              return {
                payload: {
                  sdl: schema.sdl,
                  links: getLinks(),
                  ...(pageExamples && { examples: pageExamples }),
                },
                ...props,
              };
            },
            getSchema() {
              return {
                id,
                ...schema,
              };
            },
            async getText() {
              return toMarkdown(props, schema.schema, pageExamples);
            },
            ...toStaticData(props, schema.schema),
            _graphql: {
              kind: entry.type !== 'page' ? entry.item.kind : undefined,
              deprecated: entry.info.deprecated,
              items: props.items,
            },
          },
        };
      }

      function onEntries(entries: OutputEntry[], parent?: OutputEntry): GraphQLVirtualFile[] {
        const out: GraphQLVirtualFile[] = [];
        if (!meta) {
          for (const entry of entries) {
            if (entry.type === 'group') {
              out.push(...onEntries(entry.entries, entry));
            } else {
              out.push(onEntry(entry));
            }
          }
          return out;
        }

        const { folderStyle = 'folder' } = meta === true ? {} : meta;
        const pages: string[] = [];

        for (const entry of entries) {
          const relativePath = PathUtils.slash(
            parent ? path.relative(parent.path, entry.path) : entry.path,
          );

          if (entry.type === 'group') {
            out.push(...onEntries(entry.entries, entry));
            if (folderStyle === 'folder') {
              pages.push(relativePath);
            } else {
              pages.push(`---${entry.info.title}---`, `...${relativePath}`);
            }
          } else {
            out.push(onEntry(entry));
            pages.push(relativePath.slice(0, -path.extname(entry.path).length));
          }
        }

        if (pages.length > 0) {
          out.push({
            type: 'meta',
            path: path.join(baseDir, parent?.path ?? '', 'meta.json'),
            data: {
              title: parent?.info.title,
              description: parent?.info.description,
              pages,
            },
          });
        }
        return out;
      }
    }

    return files;
  }

  return {
    options,
    getSchema,
    getSchemas,
    async staticSource(options = {}) {
      let links: GraphQLLinks | undefined;
      return {
        files: await getVirtualFiles(options, () => links),
        configureStatic({ loader }) {
          links = generateLinks(loader);
        },
      };
    },
    dynamicSource(options = {}) {
      let links: GraphQLLinks | undefined;
      const docFilesCache = new WeakMap<LoadedSchema, GraphQLVirtualFile[]>();

      return {
        cache: 'custom',
        files: () => getVirtualFiles(options, () => links, docFilesCache),
        configureStatic({ loader }) {
          links = generateLinks(loader);
        },
        invalidate() {
          docCache.clear();
          exampleCache = undefined;
        },
      };
    },
    loaderPlugin() {
      return graphqlPlugin();
    },
  };
}

export interface InternalGraphQLMeta {
  kind?: OperationKind | NamedTypeKind;
  deprecated?: boolean;
  items?: GraphQLPageItem[];
}

const OperationKindSet = new Set(['query', 'mutation', 'subscription']);

export function graphqlPlugin(): LoaderPlugin {
  return {
    name: 'fumadocs:graphql',
    enforce: 'pre',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (!file || file.format !== 'page') return node;

        const graphqlData = (file.data as { _graphql?: InternalGraphQLMeta })._graphql;
        if (!graphqlData || typeof graphqlData !== 'object') return node;

        if (graphqlData.deprecated) {
          node.name = <span className="fd-page-tree-item-name line-through">{node.name}</span>;
        }

        if (graphqlData.kind && OperationKindSet.has(graphqlData.kind)) {
          node.name = (
            <>
              {node.name}{' '}
              <KindLabel className="ms-auto text-xs text-nowrap">{graphqlData.kind}</KindLabel>
            </>
          );
        }

        return node;
      },
    },
  };
}
