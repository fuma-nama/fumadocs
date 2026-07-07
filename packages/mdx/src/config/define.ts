import type { StandardSchemaV1 } from '@standard-schema/spec';
import type { MDXPresetOptions } from '@/config/preset';
import type { ProcessorOptions } from '@mdx-js/mdx';
import { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import type { PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import type { PluginOption } from '@/core';
import type { SatteriPresetOptions } from '@fumadocs/satteri/preset';
import type { BuildEnvironment } from './build';
import type { SatteriOptionsInput } from '@/loaders/mdx/build-satteri';

export type CollectionSchema<Schema extends StandardSchemaV1, Context> =
  | Schema
  | ((ctx: Context) => Schema);

export type AnyCollection = DocsCollection | DocCollection | MetaCollection;

export interface BaseCollection {
  dir: string;
  files?: string[];
}

export interface MetaCollection<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection {
  type: 'meta';
  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocCollectionBase<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends BaseCollection {
  postprocess?: Partial<PostprocessOptions>;
  async?: boolean;
  dynamic?: boolean;
  schema?: CollectionSchema<Schema, { path: string; source: string }>;
}

export interface DocCollectionMdx<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends DocCollectionBase<Schema> {
  type: 'doc';
  compiler?: 'mdx';

  /**
   * By defining a collection-level MDX options, **the default options & plugins will be removed**.
   */
  mdxOptions?: ProcessorOptions | ((environment: BuildEnvironment) => Promise<ProcessorOptions>);
  satteriOptions?: never;
}

export interface DocCollectionSatteri<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends DocCollectionBase<Schema> {
  type: 'doc';
  compiler: 'satteri';

  /**
   * Sätteri compile options. When omitted, the global `satteriOptions` preset is used.
   */
  satteriOptions?: SatteriOptionsInput;

  mdxOptions?: never;
}

export type DocCollection<Schema extends StandardSchemaV1 = StandardSchemaV1> =
  | DocCollectionMdx<Schema>
  | DocCollectionSatteri<Schema>;

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
   * The compiler for files compiled without a collection (e.g. `page.mdx` routes).
   *
   * Collections choose their own compiler via the collection-level `compiler` option.
   *
   * @defaultValue 'mdx'
   */
  compiler?: 'mdx' | 'satteri';

  /**
   * Configure global MDX options, used by `doc` collections with the default MDX compiler.
   */
  mdxOptions?: MDXPresetOptions | (() => Promise<MDXPresetOptions>);

  /**
   * Configure global Sätteri options, used by `doc` collections with `compiler: "satteri"`.
   */
  satteriOptions?: SatteriOptionsInput;

  workspaces?: Record<
    string,
    {
      dir: string;
      config: Record<string, unknown>;
    }
  >;

  experimentalBuildCache?: string;
}

export type { SatteriPresetOptions };

type SatteriOptionsFactory = (
  environment: BuildEnvironment,
) => SatteriPresetOptions | Promise<SatteriPresetOptions>;

export interface DocCollectionSatteriTyped<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
> extends DocCollectionBase<Schema> {
  type: 'doc';
  compiler: 'satteri';
  satteriOptions?: SatteriPresetOptions | SatteriOptionsFactory;
  mdxOptions?: never;
}

export interface SatteriGlobalConfig extends Omit<GlobalConfig, 'satteriOptions'> {
  satteriOptions?: SatteriPresetOptions | SatteriOptionsFactory;
}

export function defineCollections<Schema extends StandardSchemaV1 = StandardSchemaV1>(
  options: DocCollection<Schema>,
): DocCollection<Schema>;
export function defineCollections<Schema extends StandardSchemaV1 = StandardSchemaV1>(
  options: MetaCollection<Schema>,
): MetaCollection<Schema>;

export function defineCollections(
  options: DocCollection | MetaCollection,
): DocCollection | MetaCollection {
  return options as DocCollection | MetaCollection;
}

export function defineDocs<
  DocSchema extends StandardSchemaV1 = typeof pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof metaSchema,
>(options: {
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
      schema: pageSchema as any,
      ...options?.docs,
    } as DocCollection<DocSchema>),
    meta: defineCollections({
      type: 'meta',
      dir,
      schema: metaSchema as any,
      ...options?.meta,
    } as MetaCollection<MetaSchema>),
  };
}

export function defineConfig(config: GlobalConfig = {}): GlobalConfig {
  return config;
}

export function defineSatteriConfig(config: SatteriGlobalConfig = {}): SatteriGlobalConfig {
  return config;
}

export function defineSatteriCollections<Schema extends StandardSchemaV1 = StandardSchemaV1>(
  options: DocCollectionSatteriTyped<Schema>,
): DocCollectionSatteriTyped<Schema> {
  return options;
}
