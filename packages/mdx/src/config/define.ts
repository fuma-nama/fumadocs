import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MDXPresetOptions } from '@/config/preset';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { frontmatterSchema, metaSchema } from '@/config/zod-4';
import type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import type { PluginOption } from '@/core';
import type { BuildEnvironment } from './build';

export type CollectionSchema<Schema extends StandardSchemaV1, Context> =
  | Schema
  | ((ctx: Context) => Schema);

export type AnyCollection = DocsCollection | DocCollection | MetaCollection;

export interface BaseCollection {
  /**
   * Directory to scan
   */
  dir: string;

  /**
   * what files to include/exclude (glob patterns)
   *
   * Include all files if not specified
   */
  files?: string[];
}

export interface MetaCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection {
  type: 'meta';

  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection {
  type: 'doc';

  postprocess?: Partial<PostprocessOptions>;
  mdxOptions?:
    | ProcessorOptions
    | ((environment: BuildEnvironment) => Promise<ProcessorOptions>);

  /**
   * Load files with async
   */
  async?: boolean;

  /**
   * Compile files on-demand
   */
  dynamic?: boolean;

  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocsCollection<
  DocSchema extends StandardSchemaV1 = StandardSchemaV1,
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
> {
  type: 'docs';
  dir: string;

  docs: DocCollection<DocSchema>;
  meta: MetaCollection<MetaSchema>;
}

export interface GlobalConfig {
  plugins?: PluginOption[];

  /**
   * Configure global MDX options
   *
   * @remarks `MDXPresetOptions`
   */
  mdxOptions?: MDXPresetOptions | (() => Promise<MDXPresetOptions>);

  /**
   * specify a directory to access & store cache (disabled during development mode).
   *
   * The cache will never be updated, delete the cache folder to clean.
   */
  experimentalBuildCache?: string;
}

export function defineCollections<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
>(options: DocCollection<Schema>): DocCollection<Schema>;
export function defineCollections<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
>(options: MetaCollection<Schema>): MetaCollection<Schema>;

export function defineCollections(
  options: DocCollection | MetaCollection,
): DocCollection | MetaCollection {
  return options as any;
}

export function defineDocs<
  DocSchema extends StandardSchemaV1 = typeof frontmatterSchema,
  MetaSchema extends StandardSchemaV1 = typeof metaSchema,
>(options: {
  /**
   * The content directory to scan files
   *
   *  @defaultValue 'content/docs'
   */
  dir?: string;

  docs?: Omit<DocCollection<DocSchema>, 'dir' | 'type'>;
  meta?: Omit<MetaCollection<MetaSchema>, 'dir' | 'type'>;
}): DocsCollection<DocSchema, MetaSchema> {
  const dir = options.dir ?? 'content/docs';

  return {
    type: 'docs',
    dir,
    docs: defineCollections({
      type: 'doc',
      dir,
      schema: frontmatterSchema as any,
      ...options?.docs,
    }),
    meta: defineCollections({
      type: 'meta',
      dir,
      schema: metaSchema as any,
      ...options?.meta,
    }),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}
