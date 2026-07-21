import path from 'node:path';
import type { MetaData, PageData } from 'fumadocs-core/source';
import { frontmatter as parseFrontmatter } from 'fumadocs-core/content/md/frontmatter';
import type { StandardSchemaV1 } from '@standard-schema/spec';
import * as defaultSchemas from 'fumadocs-core/source/schema';
import type { ContentIntegration, SourceFile } from '@fumadocs/local-content';

export const defaultInclude = ['**/*.{md,mdx,json}'];

export interface RawPage<Frontmatter = Record<string, unknown>> {
  path: string;
  absolutePath: string;
  content: string;
  frontmatter: Frontmatter;
}

export interface MarkdownPage<
  Frontmatter = Record<string, unknown>,
  Loaded = unknown,
> extends PageData {
  title: string;
  description?: string;
  icon?: string;
  content: string;
  frontmatter: Frontmatter;
  load: () => Promise<Loaded>;
}

export interface MarkdownIntegrationConfig<
  FrontmatterSchema extends StandardSchemaV1,
  MetaSchema extends StandardSchemaV1,
  Loaded,
> {
  include?: string[];
  frontmatterSchema?: FrontmatterSchema;
  metaSchema?: MetaSchema;
  /** called at most once per page, until the file is invalidated */
  load: (page: RawPage<StandardSchemaV1.InferOutput<FrontmatterSchema>>) => Promise<Loaded>;
}

function formatIssues(issues: readonly StandardSchemaV1.Issue[]): string {
  return issues
    .map((issue) => (issue.path ? `${issue.path}: ${issue.message}` : issue.message))
    .join('\n');
}

/** reads Markdown/MDX as pages and `.json` as meta, validated with Standard Schema */
export function markdownIntegration<
  FrontmatterSchema extends StandardSchemaV1 = typeof defaultSchemas.pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof defaultSchemas.metaSchema,
  Loaded = unknown,
>(
  config: MarkdownIntegrationConfig<FrontmatterSchema, MetaSchema, Loaded>,
): ContentIntegration<
  MarkdownPage<StandardSchemaV1.InferOutput<FrontmatterSchema>, Loaded>,
  StandardSchemaV1.InferOutput<MetaSchema> & MetaData
> {
  const {
    include = defaultInclude,
    frontmatterSchema = defaultSchemas.pageSchema,
    metaSchema = defaultSchemas.metaSchema,
    load,
  } = config;

  type $Frontmatter = StandardSchemaV1.InferOutput<FrontmatterSchema>;
  type $Meta = StandardSchemaV1.InferOutput<MetaSchema> & MetaData;

  async function page(file: SourceFile): Promise<MarkdownPage<$Frontmatter, Loaded>> {
    const parsed = parseFrontmatter(await file.read());
    const result = await frontmatterSchema['~standard'].validate(parsed.data);
    if (result.issues) {
      throw new Error(
        `invalid frontmatter in "${file.absolutePath}": ${formatIssues(result.issues)}`,
      );
    }

    const raw: RawPage<$Frontmatter> = {
      path: file.path,
      absolutePath: file.absolutePath,
      content: parsed.content,
      frontmatter: result.value,
    };
    const frontmatter = raw.frontmatter as PageData & { _openapi?: unknown };
    // the parsed file is cached until invalidated, so this compiles once
    let loaded: Promise<Loaded> | undefined;

    return {
      title: frontmatter.title ?? path.basename(file.path, path.extname(file.path)),
      description: frontmatter.description,
      icon: frontmatter.icon,
      // for Fumadocs OpenAPI
      ['_openapi' as never]: frontmatter._openapi,

      content: raw.content,
      frontmatter: raw.frontmatter,
      load: () => (loaded ??= load(raw)),
    };
  }

  async function meta(file: SourceFile): Promise<$Meta> {
    const result = await metaSchema['~standard'].validate(JSON.parse(await file.read()));
    if (result.issues) {
      throw new Error(`invalid data in "${file.absolutePath}": ${formatIssues(result.issues)}`);
    }

    return result.value as $Meta;
  }

  return {
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
  };
}
