import { pathToFileURL } from 'node:url';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { SourceOptions, WatchableSource } from '@fumadocs/local-content';
import { createMarkdownSource, type MarkdownPage } from '../../shared/local-md';
import type { DynamicSource, MetaData, StaticSource } from 'fumadocs-core/source';
import type * as defaultSchemas from 'fumadocs-core/source/schema';
import { createMarkdownCompiler, type MarkdownCompilerOptions } from './md/compiler';
import {
  fromAst,
  fromJS,
  type MarkdownRenderer,
  type MarkdownRendererASTOptions,
} from './md/renderer';

export { defaultInclude } from '../../shared/local-md';

export interface LocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> extends MarkdownCompilerOptions {
  /** root directory for content files */
  dir: string;
  /** a list of glob patterns, customize the content files to be scanned */
  include?: string[];
  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
  rendererOptions?: Pick<MarkdownRendererASTOptions, 'executor'>;
}

export interface LocalMarkdown<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> extends WatchableSource {
  /**
   * Connect to the standalone dev server for hot reload. On Vite, prefer
   * `watchWithVite()` from `@fumadocs/local-content/dev/vite`.
   */
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
}

export type LocalMarkdownPage<
  Frontmatter = Record<string, unknown>,
  ModuleExports = Record<string, unknown>,
> = MarkdownPage<Frontmatter, MarkdownRenderer<ModuleExports>>;

export function localMd<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): LocalMarkdown<FrontmatterSchema, MetaSchema> {
  const compiler = createMarkdownCompiler(config);

  return createMarkdownSource({
    ...config,
    async compile(file, { data, content }) {
      const res = await compiler.compile({
        path: file.absolutePath,
        value: content,
        data: { frontmatter: data, _compiler: file },
      });
      if (res.type === 'ast') {
        const renderer = fromAst<Record<string, unknown>>({
          tree: res.tree,
          filePath: res.file.path,
          rehypeToc: res.file.data.rehypeToc,
          structuredData: res.file.data.structuredData,
          ...config.rendererOptions,
        });
        return () => renderer;
      }
      return (props) =>
        fromJS<Record<string, unknown>>({
          code: res.code,
          filePath: res.file.path,
          baseUrl: pathToFileURL(res.file.path).href,
          structuredData: res.file.data.structuredData,
          props,
        });
    },
    // module exports are only known by the caller, so the generic is declared
    // per `staticSource()`/`dynamicSource()` call rather than here
  }) as unknown as LocalMarkdown<FrontmatterSchema, MetaSchema>;
}

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
