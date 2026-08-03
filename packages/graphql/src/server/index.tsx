import fs from 'node:fs';
import path from 'node:path';
import {
  createGetUrl,
  type DynamicSource,
  getSlugs,
  type LoaderPlugin,
  type MetaData,
  PathUtils,
  type PageData,
  type Source,
  type VirtualFile,
} from 'fumadocs-core/source';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import {
  isFilePath,
  loadSchema,
  type GraphQLSchemaInput,
  type LoadedSchema,
} from '@/utils/document/load';
import type { Awaitable } from '@/types';
import {
  getPageProps,
  type OperationOutput,
  type OutputEntry,
  type PageOutput,
  type TypeOutput,
} from '@/utils/pages/builder';
import { toStaticData } from '@/utils/pages/to-static-data';
import type { SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import type { GraphQLLinks, GraphQLPageProps } from '@/ui';
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
  _getWatchPaths: () => string[];
}

export interface GraphQLPageData extends PageData {
  getGraphQLPageProps: () => GraphQLPageProps;
  getSchema: () => { id: string } & LoadedSchema;
  structuredData: StructuredData;
  toc: TOCItemType[];
  _graphql: InternalGraphQLMeta;
}

export type GraphQLSourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  /**
   * the `baseUrl` of your `loader()`.
   *
   * when specified, links of generated pages are pre-generated and passed to the UI,
   * for cross-linking type & operation references.
   */
  baseUrl?: string;
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createGraphQL(options: GraphQLOptions = {}): GraphQLServer {
  const { disableCache = false } = options;
  const schemaMap = new Map<string, Promise<LoadedSchema>>();

  let resolvedInput: SchemaRecord = {};
  if (Array.isArray(options.input)) {
    for (const item of options.input) resolvedInput[item] = item;
  } else if (options.input) {
    resolvedInput = options.input;
  }

  function getSchema(schemaId: string): Promise<LoadedSchema> {
    if (!(schemaId in resolvedInput)) {
      console.warn(
        `[Fumadocs GraphQL] the schema "${schemaId}" is not listed in the input array, this may be unexpected and won't be cached properly.`,
      );
      return loadSchema(schemaId);
    }

    if (!disableCache) {
      const cached = schemaMap.get(schemaId);
      if (cached) return cached;
    }

    const raw = resolvedInput[schemaId];
    const output = Promise.resolve(typeof raw === 'function' ? raw() : raw).then(loadSchema);
    if (!disableCache) schemaMap.set(schemaId, output);
    return output;
  }

  async function getSchemas(): Promise<Record<string, LoadedSchema>> {
    const entries = await Promise.all(
      Object.keys(resolvedInput).map(async (k) => [k, await getSchema(k)]),
    );
    return Object.fromEntries(entries);
  }

  async function getVirtualFiles(server: GraphQLServer, options: GraphQLSourceOptions) {
    const { baseDir = '', meta = false, baseUrl } = options;
    const { createAutoPreset } = await import('@/utils/pages/preset-auto');
    const { fromSchema } = await import('@/utils/pages/builder');
    const files: VirtualFile<{
      pageData: GraphQLPageData;
      metaData: MetaData;
    }>[] = [];

    const schemas = await server.getSchemas();
    const builderOptions = createAutoPreset(options);
    // pre-generate the links of generated pages, the map is completed during the walk below,
    // before any page props are requested.
    const getUrl = baseUrl !== undefined ? createGetUrl(baseUrl) : undefined;
    const links: GraphQLLinks | undefined = getUrl ? { types: {}, operations: {} } : undefined;

    for (const [id, schema] of Object.entries(schemas)) {
      const list = fromSchema(id, schema.schema, builderOptions);

      onEntries(list);

      function onEntry(entry: OperationOutput | TypeOutput | PageOutput) {
        const props = getPageProps(entry);
        const filePath = `${baseDir}/${entry.path}`;

        if (links) {
          const url = getUrl!(getSlugs(filePath));

          for (const item of props.items ?? []) {
            if (item.type === 'operation') {
              links.operations[`${item.kind}:${item.name}`] = url;
            } else {
              links.types[item.name] = url;
            }
          }
        }

        files.push({
          type: 'page',
          path: filePath,
          data: {
            ...entry.info,
            getGraphQLPageProps() {
              return {
                payload: {
                  sdl: schema.sdl,
                  links,
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
            ...toStaticData(props, schema.schema),
            _graphql: {
              kind: entry.type !== 'page' ? entry.item.kind : undefined,
              deprecated: entry.info.deprecated,
            },
          },
        });
      }

      function onEntries(entries: OutputEntry[], parent?: OutputEntry) {
        if (!meta) {
          for (const entry of entries) {
            if (entry.type === 'group') {
              onEntries(entry.entries, entry);
            } else {
              onEntry(entry);
            }
          }

          return;
        }

        const { folderStyle = 'folder' } = meta === true ? {} : meta;
        const pages: string[] = [];

        for (const entry of entries) {
          const relativePath = PathUtils.slash(
            parent ? path.relative(parent.path, entry.path) : entry.path,
          );

          if (entry.type === 'group') {
            onEntries(entry.entries, entry);
            if (folderStyle === 'folder') {
              pages.push(relativePath);
            } else {
              pages.push(`---${entry.info.title}---`, `...${relativePath}`);
            }
          } else {
            onEntry(entry);
            pages.push(relativePath.slice(0, -path.extname(entry.path).length));
          }
        }

        if (pages.length === 0) return;
        files.push({
          type: 'meta',
          path: path.join(baseDir, parent?.path ?? '', 'meta.json'),
          data: {
            title: parent?.info.title,
            description: parent?.info.description,
            pages,
          },
        });
      }
    }

    return files;
  }

  return {
    options,
    _getWatchPaths() {
      const paths: string[] = [];
      for (const value of Object.values(resolvedInput)) {
        const items = Array.isArray(value) ? value : [value];

        for (const item of items) {
          if (typeof item === 'string' && isFilePath(item) && fs.existsSync(item)) {
            paths.push(item);
          }
        }
      }

      return paths;
    },
    getSchema,
    getSchemas,
    async staticSource(options = {}) {
      return {
        files: await getVirtualFiles(this, options),
      };
    },
    dynamicSource(options = {}) {
      return {
        files: () => getVirtualFiles(this, options),
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
