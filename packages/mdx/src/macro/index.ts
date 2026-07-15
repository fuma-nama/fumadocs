import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { MetaData, PageData } from 'fumadocs-core/source';
import type { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import type { CollectionSchema } from '@/config/define';
import type { BuildEnvironment } from '@/config/build';
import type { ExtractedReference, PostprocessOptions } from '@/loaders/mdx/remark-postprocess';
import type { SatteriOptionsInput } from '@/loaders/mdx/build-satteri';
import type {
  MacroAsyncDocCollection,
  MacroAsyncDocsCollection,
  MacroDocCollection,
  MacroDocsCollection,
  MacroMetaCollection,
} from '@/runtime/macro';

export interface MacroSchemaContext {
  path: string;
  source: string;
}

export interface DocMacroOptions<
  Schema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> {
  /**
   * Patterns of content files (relative to `dir`).
   *
   * Must be statically analyzable (string literals).
   */
  files?: string[];

  /**
   * Load the compiled content lazily.
   *
   * Must be statically analyzable (boolean literal).
   */
  async?: Async;

  /**
   * The compiler for content files.
   */
  compiler?: 'mdx' | 'satteri';

  /**
   * By defining a collection-level MDX options, **the default options & plugins will be removed**.
   */
  mdxOptions?: ProcessorOptions | ((environment: BuildEnvironment) => Promise<ProcessorOptions>);

  /**
   * Sätteri compile options, used when `compiler` is `satteri`.
   */
  satteriOptions?: SatteriOptionsInput;

  postprocess?: Partial<PostprocessOptions>;

  schema?: CollectionSchema<Schema, MacroSchemaContext>;
}

export interface MetaMacroOptions<Schema extends StandardSchemaV1 = StandardSchemaV1> {
  /**
   * Patterns of meta files (relative to `dir`).
   *
   * Must be statically analyzable (string literals).
   */
  files?: string[];

  schema?: CollectionSchema<Schema, MacroSchemaContext>;
}

export interface DefineDocsOptions<
  DocsSchema extends StandardSchemaV1 = StandardSchemaV1,
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> {
  /**
   * Directory of content files, relative to project root.
   *
   * Must be statically analyzable (string literal).
   *
   * @defaultValue 'content/docs'
   */
  dir?: string;

  docs?: DocMacroOptions<DocsSchema, Async>;
  meta?: MetaMacroOptions<MetaSchema>;
}

export interface DefineDocCollectionsOptions<
  DocsSchema extends StandardSchemaV1 = StandardSchemaV1,
  Async extends boolean = boolean,
> extends DocMacroOptions<DocsSchema, Async> {
  type: 'doc';
  /**
   * Directory of content files, relative to project root.
   *
   * Must be statically analyzable (string literal).
   */
  dir: string;
}

export interface DefineMetaCollectionsOptions<
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
> extends MetaMacroOptions<MetaSchema> {
  type: 'meta';
  /**
   * Directory of meta files, relative to project root.
   *
   * Must be statically analyzable (string literal).
   */
  dir: string;
}

function macroError(): Error {
  return new Error(
    '[MDX] this macro was not compiled by the bundler plugin of `fumadocs-mdx`. To use `fumadocs-mdx/macro`, set the `include` option on your bundler plugin, and make sure this module matches its patterns.',
  );
}

// TODO: infer from collection options
// exported because it appears in the inferred return types of the macros below
export interface Temp {
  extractedReferences?: ExtractedReference[];
  lastModified?: Date;
}

/**
 * Define a docs collection (doc + meta), compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineDocs<
  DocsSchema extends StandardSchemaV1 = typeof pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof metaSchema,
  const Async extends boolean = false,
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- compiled away by the bundler plugin
  options?: DefineDocsOptions<DocsSchema, MetaSchema, Async>,
): StandardSchemaV1.InferOutput<DocsSchema> extends PageData
  ? StandardSchemaV1.InferOutput<MetaSchema> extends MetaData
    ? Async extends true
      ? MacroAsyncDocsCollection<
          StandardSchemaV1.InferOutput<DocsSchema>,
          StandardSchemaV1.InferOutput<MetaSchema>,
          Temp
        >
      : MacroDocsCollection<
          StandardSchemaV1.InferOutput<DocsSchema>,
          StandardSchemaV1.InferOutput<MetaSchema>,
          Temp
        >
    : never
  : never {
  throw macroError();
}

export function defineCollections<MetaSchema extends StandardSchemaV1 = StandardSchemaV1>(
  options: DefineMetaCollectionsOptions<MetaSchema>,
): MacroMetaCollection<StandardJSONSchemaV1.InferOutput<MetaSchema>>;

export function defineCollections<
  DocSchema extends StandardSchemaV1 = StandardSchemaV1,
  const Async extends boolean = false,
>(
  options: DefineDocCollectionsOptions<DocSchema, Async>,
): Async extends true
  ? MacroAsyncDocCollection<StandardJSONSchemaV1.InferOutput<DocSchema>, Temp>
  : MacroDocCollection<StandardJSONSchemaV1.InferOutput<DocSchema>, Temp>;

/**
 * Define a doc/meta collection, compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineCollections(): never {
  throw macroError();
}
