import { loadDocument } from '@/utils/document/load';
import type { AsyncAPIObject, Awaitable } from '@/types';
import fs from 'node:fs';
import type {
  DynamicSource,
  LoaderPlugin,
  PageData,
  MetaData,
  Source,
  VirtualFile,
  Page,
} from 'fumadocs-core/source';
import {
  fromSchema,
  getMetaPages,
  getPageProps,
  type OutputEntry,
  type OutputGroup,
} from '@/utils/pages/builder';
import type { AsyncAPIPageProps_Preloaded, AsyncAPIPageProps_Spec } from '@/utils/create-page';
import { toStaticData } from '@/utils/pages/to-static-data';
import { toMarkdown } from '@/utils/pages/to-markdown';
import path from 'node:path';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
import type { TOCItemType } from 'fumadocs-core/toc';
import { createAutoPreset, type SchemaToPagesOptions } from '@/utils/pages/preset-auto';
import { DirectionIcon } from '@/ui/components/direction';

type SchemaRecord = Record<
  string,
  string | AsyncAPIObject | (() => Awaitable<string | AsyncAPIObject>)
>;
interface LoadedDocument {
  bundled: AsyncAPIObject;
}
type AsyncAPIVirtualFile = VirtualFile<{ pageData: AsyncAPIPageData; metaData: MetaData }>;

export interface AsyncAPIOptions {
  input?: string[] | SchemaRecord;
  disableCache?: boolean;
}

export type { AsyncAPIPageProps_Spec, AsyncAPIPageProps_Preloaded };

export interface AsyncAPIServer {
  getSchemas: () => Promise<Record<string, LoadedDocument>>;
  getSchema: (document: string) => Promise<LoadedDocument>;
  readonly options: AsyncAPIOptions;
  staticSource: (
    options?: AsyncAPISourceOptions,
  ) => Promise<Source<{ metaData: MetaData; pageData: AsyncAPIPageData }>>;
  dynamicSource: (
    options?: AsyncAPISourceOptions,
  ) => DynamicSource<{ metaData: MetaData; pageData: AsyncAPIPageData }>;
  preloadAsyncAPIPage: <Type extends string | undefined, Data extends PageData>(
    page: Page<Type, Data>,
  ) => Promise<Pick<AsyncAPIPageProps_Preloaded, 'preloaded'>>;
  loaderPlugin: () => LoaderPlugin;
  _getWatchPaths: () => string[];
}

export interface AsyncAPIPageData extends PageData {
  getAsyncAPIPageProps: () => AsyncAPIPageProps_Spec;
  getSchema: () => { id: string; bundled: AsyncAPIObject };
  /** the operations of page in Markdown, for LLMs */
  getText: (type: 'raw' | 'processed') => Promise<string>;
  structuredData: StructuredData;
  toc: TOCItemType[];
  _asyncapi: InternalAsyncAPIMeta;
}

export type AsyncAPISourceOptions = SchemaToPagesOptions & {
  baseDir?: string;
  meta?: boolean | { folderStyle?: 'folder' | 'separator' };
};

export function createAsyncAPI(options: AsyncAPIOptions = {}): AsyncAPIServer {
  const { disableCache = false } = options;
  const docCache = new Map<string, Promise<LoadedDocument>>();

  let input: SchemaRecord = {};
  if (Array.isArray(options.input)) {
    for (const item of options.input) input[item] = item;
  } else if (options.input) {
    input = options.input;
  }

  function getSchema(id: string): Promise<LoadedDocument> {
    if (!(id in input)) {
      console.warn(
        `[Fumadocs AsyncAPI] the document "${id}" is not listed in the input array, this may be unexpected and won't be cached properly.`,
      );
      return loadDocument(id);
    }

    let output = disableCache ? undefined : docCache.get(id);
    if (!output) {
      const raw = input[id];
      output = Promise.resolve(typeof raw === 'function' ? raw() : raw).then(loadDocument);
      if (!disableCache) docCache.set(id, output);
    }

    return output;
  }

  async function getSchemas(): Promise<Record<string, LoadedDocument>> {
    const entries = await Promise.all(
      Object.keys(input).map(async (id) => [id, await getSchema(id)]),
    );
    return Object.fromEntries(entries);
  }

  async function getVirtualFiles(
    options: AsyncAPISourceOptions,
    cache?: WeakMap<LoadedDocument, AsyncAPIVirtualFile[]>,
  ): Promise<AsyncAPIVirtualFile[]> {
    const { baseDir = '', meta = false } = options;
    const { folderStyle = 'folder' } = typeof meta === 'object' ? meta : {};
    const preset = createAutoPreset(options);

    function toFiles(id: string, bundled: AsyncAPIObject): AsyncAPIVirtualFile[] {
      const out: AsyncAPIVirtualFile[] = [];

      function scan(entries: OutputEntry[], parent?: OutputGroup) {
        for (const entry of entries) {
          if (entry.type === 'group') {
            scan(entry.entries, entry);
            continue;
          }

          const props = getPageProps(entry);
          out.push({
            type: 'page',
            path: `${baseDir}/${entry.path}`,
            data: {
              ...entry.info,
              getAsyncAPIPageProps() {
                return { payload: { bundled }, ...props };
              },
              getSchema() {
                return { id, bundled };
              },
              async getText() {
                return toMarkdown(props, bundled);
              },
              ...toStaticData(props, bundled),
              _asyncapi: {
                action: entry.type === 'operation' ? entry.item.action : undefined,
              },
            },
          });
        }

        if (!meta) return;
        const pages = getMetaPages(entries, parent, folderStyle);
        if (pages.length === 0) return;
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

      scan(fromSchema(id, bundled, preset));
      return out;
    }

    const files: AsyncAPIVirtualFile[] = [];
    for (const [id, schema] of Object.entries(await getSchemas())) {
      let docFiles = cache?.get(schema);
      if (!docFiles) {
        docFiles = toFiles(id, schema.bundled);
        cache?.set(schema, docFiles);
      }

      for (const file of docFiles) files.push(file);
    }

    return files;
  }

  return {
    options,
    _getWatchPaths() {
      return Object.values(input).filter(
        (value): value is string =>
          typeof value === 'string' && !URL.canParse(value) && fs.existsSync(value),
      );
    },
    async preloadAsyncAPIPage(page) {
      const { preload = [] } = (page.data as { _asyncapi?: InternalAsyncAPIMeta })._asyncapi ?? {};
      const docs = await Promise.all(
        preload.map(async (id) => [id, (await getSchema(id)).bundled]),
      );

      return { preloaded: { docs: Object.fromEntries(docs) } };
    },
    getSchema,
    getSchemas,
    async staticSource(options = {}) {
      return { files: await getVirtualFiles(options) };
    },
    dynamicSource(options = {}) {
      const cache = new WeakMap<LoadedDocument, AsyncAPIVirtualFile[]>();
      return {
        cache: 'custom',
        files: () => getVirtualFiles(options, cache),
        invalidate() {
          docCache.clear();
        },
      };
    },
    loaderPlugin: asyncapiPlugin,
  };
}

export interface InternalAsyncAPIMeta {
  action?: 'send' | 'receive';
  preload?: string[];
}

export function asyncapiPlugin(): LoaderPlugin {
  return {
    name: 'fumadocs:asyncapi',
    enforce: 'pre',
    transformPageTree: {
      file(node, filePath) {
        if (!filePath) return node;
        const file = this.storage.read(filePath);
        if (!file || file.format !== 'page') return node;

        const asyncapiData = (file.data as { _asyncapi?: InternalAsyncAPIMeta })._asyncapi;
        if (!asyncapiData?.action) return node;

        node.name = (
          <>
            {node.name}{' '}
            <DirectionIcon action={asyncapiData.action} className="ms-auto text-[0.6875rem]" />
          </>
        );
        return node;
      },
    },
  };
}
