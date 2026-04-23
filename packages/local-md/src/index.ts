import type { DynamicSource, MetaData, StaticSource, VirtualFile } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import path from 'node:path';
import { createStorage, RawPage } from './storage';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { type PageRenderer, type MarkdownRendererASTOptions, fromAst, fromJS } from './md/renderer';
import { CompileResult, createMarkdownCompiler, MarkdownCompilerOptions } from './md/compiler';
import { getDevServerUrlFromEnv } from './dev/shared';
import type { DynamicLoader } from 'fumadocs-core/source/dynamic';
import { defaultInclude } from './shared';
import { pathToFileURL } from 'node:url';

export interface LocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> extends MarkdownCompilerOptions {
  /**
   * root directory for content files.
   */
  dir: string;
  /**
   * a list of glob patterns, customize the content files to be scanned.
   */
  include?: string[];
  rendererOptions?: Pick<MarkdownRendererASTOptions, 'executor'>;

  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
}

export interface LocalMarkdown<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> {
  /** connect to dev server, required for hot reload */
  devServer: (url?: string) => Promise<void>;
  staticSource: <ModuleExports = Record<string, unknown>>() => Promise<
    StaticSource<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, ModuleExports>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  >;
  dynamicSource: <ModuleExports = Record<string, unknown>>() => DynamicSource<{
    pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, ModuleExports>;
    metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  }>;

  invalidateFile: (file: string) => void;
}

export interface LocalMarkdownPage<
  Frontmatter = Record<string, unknown>,
  ModuleExports = Record<string, unknown>,
> {
  title: string;
  description?: string;
  content: string;
  frontmatter: Frontmatter;

  load: () => Promise<PageRenderer<ModuleExports>>;
}

export function localMd<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): LocalMarkdown<FrontmatterSchema, MetaSchema> {
  const storage = createStorage(config);
  const compiler = createMarkdownCompiler(config);
  const compilerCache = new WeakMap<RawPage<unknown>, Promise<CompileResult>>();
  const registeredLoaders = new Set<DynamicLoader>();
  let cachedStaticSource: Promise<
    StaticSource<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, never>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  > | null = null;

  async function createFiles() {
    const { metas, pages } = await storage.getPages();
    const files: VirtualFile<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, never>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>[] = [];

    for (const page of pages) {
      files.push({
        type: 'page',
        path: page.path,
        absolutePath: page.absolutePath,
        data: {
          title: page.title,
          description: page.description,
          content: page.content,
          frontmatter: page.frontmatter,
          load() {
            let promise = compilerCache.get(page);
            if (!promise) {
              promise = compiler.compile({
                path: page.absolutePath,
                value: page.content,
                data: { frontmatter: page.frontmatter },
              });
            }

            return promise.then((res) =>
              res.type === 'ast'
                ? fromAst({
                    tree: res.tree,
                    filePath: res.file.path,
                    rehypeToc: res.file.data.rehypeToc,
                    structuredData: res.file.data.structuredData,
                    ...config.rendererOptions,
                  })
                : fromJS({
                    code: res.code,
                    filePath: res.file.path,
                    baseUrl: pathToFileURL(res.file.path).href,
                    structuredData: res.file.data.structuredData,
                  }),
            );
          },
        },
      });
    }

    for (const meta of metas) {
      files.push({
        type: 'meta',
        path: meta.path,
        absolutePath: meta.absolutePath,
        data: meta.data!,
      });
    }

    return files;
  }

  return {
    invalidateFile(file) {
      const absolutePath = path.resolve(file);
      cachedStaticSource = null;
      storage.invalidateCache(absolutePath);
      for (const v of registeredLoaders) v.revalidate();
    },
    async devServer(url = getDevServerUrlFromEnv()) {
      if (!url) {
        console.warn(
          `[@fumadocs/local-md] dev server URL could not be found, try passing the URL to devServer() explicitly instead`,
        );
        return;
      }

      const { connectDevServer } = await import('@/dev/node-client');
      const conn = connectDevServer(url);
      conn.send({
        type: 'watch-dir',
        dir: path.resolve(config.dir),
        includes: config.include ?? defaultInclude,
      });

      conn.subscribe((event) => {
        if (event.type === 'change') {
          this.invalidateFile(event.absolutePath);
        }
      });
    },
    dynamicSource() {
      return {
        files: createFiles,
        configure(loader) {
          registeredLoaders.add(loader);
        },
      };
    },
    staticSource() {
      return (cachedStaticSource ??= createFiles().then((files) => ({ files })));
    },
  };
}

export type { RawMeta, RawPage } from './storage';
export type {
  MDXProcessorOptions,
  CompileResult,
  MarkdownCompilerOptions,
  MarkdownCompiler,
  MarkdownProcessorOptions,
} from './md/compiler';
export type {
  MarkdownRendererASTOptions,
  MarkdownRendererJSOptions,
  MarkdownRendererSerializedOptions,
  PageRenderer,
} from './md/renderer';
