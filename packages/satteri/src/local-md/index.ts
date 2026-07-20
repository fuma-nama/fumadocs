import type { MetaData, DynamicSource, StaticSource } from 'fumadocs-core/source';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type LocalPage,
  type SourceOptions,
  type StorageConfig,
} from '@fumadocs/local-content';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { pathToFileURL } from 'node:url';
import { fromJS, type MarkdownRenderer } from './renderer';
import { createMarkdownCompiler, type MarkdownCompilerOptions } from './compiler';

export type SatteriLocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> = StorageConfig<FrontmatterSchema, MetaSchema> & MarkdownCompilerOptions;

export interface SatteriLocalMarkdown<
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
  config: SatteriLocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): SatteriLocalMarkdown<FrontmatterSchema, MetaSchema> {
  const compiler = createMarkdownCompiler(config);

  const source = createLocalSource<FrontmatterSchema, MetaSchema, MarkdownRenderer<never>>({
    ...config,
    async load(page) {
      const res = await compiler.compile({
        path: page.absolutePath,
        value: page.content,
        data: { frontmatter: page.frontmatter as Record<string, unknown> },
      });

      return fromJS({
        code: res.code,
        filePath: res.filePath,
        baseUrl: pathToFileURL(res.filePath).href,
        structuredData: res.structuredData,
      });
    },
  });

  return source as unknown as SatteriLocalMarkdown<FrontmatterSchema, MetaSchema>;
}

export { createMarkdownCompiler } from './compiler';
export type { MarkdownCompiler, MarkdownCompilerOptions, CompileResult } from './compiler';
export type { MarkdownRenderer } from './renderer';
