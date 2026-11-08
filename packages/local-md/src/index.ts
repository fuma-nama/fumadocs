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
import type { StructuredData } from 'fumadocs-core/mdx-plugins';
import {
  isDynamicPath,
  type DynamicSource,
  type MetaData,
  type PageData,
  type Params,
  type StaticSource,
} from 'fumadocs-core/source';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import { createMarkdownCompiler, type MarkdownCompilerOptions } from './md/compiler';
import {
  fromAst,
  fromJS,
  type MarkdownRenderer,
  type MarkdownRendererASTOptions,
} from './md/renderer';

export const defaultInclude = ['**/*.{md,mdx,json}', '**/meta{,.*}.{js,ts}'];

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
  config: LocalMarkdownConfig<FrontmatterSchema, MetaSchema>,
): LocalMarkdown<FrontmatterSchema, MetaSchema> {
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
    frontmatter: $Frontmatter,
    params?: Params,
  ): Promise<MarkdownRenderer> {
    const res = await compiler.compile({
      path: file.absolutePath,
      value: content,
      data: { frontmatter, _compiler: file, params },
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
          props: params,
        });
  }

  /** with frontmatter in code, a dynamic file has its frontmatter at each params */
  async function page(
    file: SourceFile,
    { data, content }: ReturnType<typeof parseFrontmatter>,
    code: boolean,
    params?: Params,
  ): Promise<LocalMarkdownPage<$Frontmatter>> {
    let frontmatter: unknown = data;
    // the parsed file is cached until invalidated, so this compiles once
    let loaded: Promise<MarkdownRenderer> | undefined;
    const load = () => (loaded ??= compile(file, content, frontmatter as $Frontmatter, params));

    if (!code || params || !isDynamicPath(file.path)) {
      if (code)
        frontmatter = {
          ...(data as object),
          ...((await (await load()).render()).exports.frontmatter as object),
        };
      const result = await frontmatterSchema['~standard'].validate(frontmatter);
      if (result.issues) {
        throw new Error(
          `invalid frontmatter in "${file.absolutePath}": ${formatIssues(result.issues)}`,
        );
      }
      frontmatter = result.value;
    }
    const pageData = frontmatter as PageData & { _openapi?: unknown };

    return {
      title: pageData.title ?? path.basename(file.path, path.extname(file.path)),
      description: pageData.description,
      icon: pageData.icon,
      staticParams: pageData.staticParams,
      // for Fumadocs OpenAPI
      ['_openapi' as never]: pageData._openapi,

      content,
      frontmatter: frontmatter as $Frontmatter,
      load,
      structuredData: async () => (await load()).structuredData,
    };
  }

  function pageAt(
    file: SourceFile,
    data: LocalMarkdownPage<$Frontmatter>,
    params: Params,
  ): LocalMarkdownPage<$Frontmatter> {
    let loaded: Promise<MarkdownRenderer> | undefined;
    const load = () => (loaded ??= compile(file, data.content, data.frontmatter, params));
    return { ...data, load, structuredData: async () => (await load()).structuredData };
  }

  async function meta(file: SourceFile, value: unknown): Promise<$Meta> {
    const result = await metaSchema['~standard'].validate(value);
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
            return { type: 'meta', data: await meta(file, JSON.parse(await file.read())) };
          case '.js':
          case '.ts': {
            // a new module after the file changes
            const url = pathToFileURL(file.absolutePath);
            url.searchParams.set('t', String(Date.now()));
            const { default: data, staticParams } = (await import(
              /* webpackIgnore: true */ /* @vite-ignore */ url.href
            )) as { default: $Meta | ((params: Params) => $Meta); staticParams?: Params[] };
            if (typeof data !== 'function')
              return { type: 'meta', data: await meta(file, { staticParams, ...data }) };
            return {
              type: 'meta',
              data: { staticParams } as $Meta,
              dataAt: (params) => meta(file, { staticParams, ...data(params) }),
            };
          }
          case '.md':
          case '.mdx': {
            const parsed = parseFrontmatter(await file.read());
            const code =
              file.path.endsWith('.mdx') && /^export const frontmatter\b/m.test(parsed.content);
            const data = await page(file, parsed, code);
            return {
              type: 'page',
              data,
              dataAt: (params) =>
                code ? page(file, parsed, code, params) : pageAt(file, data, params),
            };
          }
        }
      },
    },
  });

  // module exports are only known by the caller, so the generic is declared
  // per `staticSource()`/`dynamicSource()` call rather than here
  return source as unknown as LocalMarkdown<FrontmatterSchema, MetaSchema>;
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
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
