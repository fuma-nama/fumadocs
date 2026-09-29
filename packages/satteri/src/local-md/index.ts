import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import {
  createLocalSource,
  type SourceFile,
  type SourceOptions,
  type WatchableSource,
} from '@fumadocs/local-content';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { DynamicSource, MetaData, PageData, StaticSource } from 'fumadocs-core/source';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import type { StructuredData } from '@/remark-structure';
import { createMarkdownCompiler, type MarkdownCompilerOptions } from './compiler';
import { fromJS, type MarkdownRenderer } from './renderer';

export const defaultInclude = ['**/*.{md,mdx,json}'];

export interface SatteriLocalMarkdownConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
> extends MarkdownCompilerOptions {
  /** root directory for content files */
  dir: string;
  /** a list of glob patterns, customize the content files to be scanned */
  include?: string[];
  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
}

export interface SatteriLocalMarkdown<
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

  invalidateFile: (file: string) => void;
}

export interface LocalMarkdownPage<
  Frontmatter = Record<string, unknown>,
  ModuleExports = Record<string, unknown>,
> extends PageData {
  title: string;
  description?: string;
  icon?: string;
  content: string;
  frontmatter: Frontmatter;
  /** compile the page, at most once until the file is invalidated */
  load: () => Promise<MarkdownRenderer<ModuleExports>>;
  structuredData: () => Promise<StructuredData>;
}

export function localMd<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
>(
  config: SatteriLocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): SatteriLocalMarkdown<FrontmatterSchema, MetaSchema> {
  type $Frontmatter = StandardSchemaV1.InferOutput<FrontmatterSchema>;
  type $Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;

  const {
    include = defaultInclude,
    frontmatterSchema = defaultSchemas.pageSchema,
    metaSchema = defaultSchemas.metaSchema,
  } = config;
  const compiler = createMarkdownCompiler(config);

  async function compile(
    file: SourceFile,
    content: string,
    frontmatter: Record<string, unknown>,
  ): Promise<MarkdownRenderer> {
    const res = await compiler.compile({
      path: file.absolutePath,
      value: content,
      data: { frontmatter },
    });

    return fromJS({
      code: res.code,
      filePath: res.filePath,
      baseUrl: pathToFileURL(res.filePath).href,
      structuredData: res.structuredData,
    });
  }

  async function page(file: SourceFile): Promise<LocalMarkdownPage<$Frontmatter>> {
    const parsed = parseFrontmatter(await file.read());
    const result = await frontmatterSchema['~standard'].validate(parsed.data);
    if (result.issues) {
      throw new Error(
        `invalid frontmatter in "${file.absolutePath}": ${formatIssues(result.issues)}`,
      );
    }

    const frontmatter = result.value as $Frontmatter;
    const pageData = frontmatter as PageData & { _openapi?: unknown };
    // the parsed file is cached until invalidated, so this compiles once
    let loaded: Promise<MarkdownRenderer> | undefined;
    const load = () =>
      (loaded ??= compile(file, parsed.content, frontmatter as Record<string, unknown>));

    return {
      title: pageData.title ?? path.basename(file.path, path.extname(file.path)),
      description: pageData.description,
      icon: pageData.icon,
      // for Fumadocs OpenAPI
      ['_openapi' as never]: pageData._openapi,

      content: parsed.content,
      frontmatter,
      load,
      structuredData: async () => (await load()).structuredData,
    };
  }

  async function meta(file: SourceFile): Promise<$Meta> {
    const result = await metaSchema['~standard'].validate(JSON.parse(await file.read()));
    if (result.issues) {
      throw new Error(`invalid data in "${file.absolutePath}": ${formatIssues(result.issues)}`);
    }

    return result.value as $Meta;
  }

  const source = createLocalSource<LocalMarkdownPage<$Frontmatter>, $Meta>({
    dir: config.dir,
    integration: {
      include,
      async parse(file) {
        switch (path.extname(file.path)) {
          case '.json':
            return { type: 'meta', data: await meta(file) };
          case '.md':
          case '.mdx':
            return { type: 'page', data: await page(file) };
        }
      },
    },
  });

  // module exports are only known by the caller, so the generic is declared
  // per `staticSource()`/`dynamicSource()` call rather than here
  return source as unknown as SatteriLocalMarkdown<FrontmatterSchema, MetaSchema>;
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
}

export { createMarkdownCompiler } from './compiler';
export type { MarkdownCompiler, MarkdownCompilerOptions, CompileResult } from './compiler';
export type { MarkdownRenderer } from './renderer';
