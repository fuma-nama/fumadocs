import type { MetaData, DynamicSource, StaticSource } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type LocalPage,
  type SourceOptions,
  type StorageConfig,
} from '@fumadocs/local-content';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import {
  type MarkdownRenderer,
  type MarkdownRendererASTOptions,
  fromAst,
  fromJS,
} from './md/renderer';
import { createMarkdownCompiler, MarkdownCompilerOptions } from './md/compiler';
import { pathToFileURL } from 'node:url';

export interface LocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
>
  extends MarkdownCompilerOptions, StorageConfig<FrontmatterSchema, MetaSchema> {
  rendererOptions?: Pick<MarkdownRendererASTOptions, 'executor'>;
}

export interface LocalMarkdown<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> {
  /** connect to dev server, required for hot reload */
  devServer: (url?: string) => Promise<void>;
  staticSource: <ModuleExports = Record<string, unknown>>(
    options?: SourceOptions,
  ) => Promise<
    StaticSource<{
      pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, ModuleExports>;
      metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
    }>
  >;
  dynamicSource: <ModuleExports = Record<string, unknown>>(
    options?: SourceOptions,
  ) => DynamicSource<{
    pageData: LocalMarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, ModuleExports>;
    metaData: StandardSchemaV1.InferOutput<MetaSchema> & MetaData;
  }>;

  invalidateFile: (file: string) => void;
}

export type LocalMarkdownPage<
  Frontmatter = Record<string, unknown>,
  ModuleExports = Record<string, unknown>,
> = LocalPage<Frontmatter, MarkdownRenderer<ModuleExports>>;

export function localMd<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): LocalMarkdown<FrontmatterSchema, MetaSchema> {
  const compiler = createMarkdownCompiler(config);

  const source = createLocalSource<FrontmatterSchema, MetaSchema, MarkdownRenderer<never>>({
    ...config,
    async load(page) {
      const res = await compiler.compile({
        path: page.absolutePath,
        value: page.content,
        data: { frontmatter: page.frontmatter },
      });

      return res.type === 'ast'
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
          });
    },
  });

  // the module exports of a page are only known by its caller, so the generic
  // is declared per `staticSource()`/`dynamicSource()` call rather than here
  return source as unknown as LocalMarkdown<FrontmatterSchema, MetaSchema>;
}

export type { RawMeta, RawPage } from '@fumadocs/local-content';
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
  MarkdownRenderer,
  MarkdownRendererResult,
} from './md/renderer';
