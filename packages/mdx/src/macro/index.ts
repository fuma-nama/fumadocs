import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';
import type { ProcessorOptions } from '@mdx-js/mdx';
import type { MetaData, PageData } from 'fumadocs-core/source';
import type { metaSchema, pageSchema } from 'fumadocs-core/source/schema';
import type { CollectionSchema } from '@/config/define';
import type { BuildEnvironment } from '@/config/build';
import type { ExtractedReference, PostprocessOptions } from '@/loaders/mdx/remark-postprocess';

// referenced by entry types, re-exported so declaration emit in consumer projects can name it
export type { ExtractedReference } from '@/loaders/mdx/remark-postprocess';
import type { SatteriOptionsInput } from '@/loaders/mdx/build-satteri';
import type { Analysis } from 'fumadocs-core/mdx-plugins/stringifier';
import type { StructuredData } from 'fumadocs-core/mdx-plugins/remark-structure';
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

type DocMacroFlags = {
  schema: StandardSchemaV1;
  async: boolean;
  lastModified: boolean;
  analysis: Analysis | undefined;
};

type GetExtras<T extends DocMacroFlags> = (T['lastModified'] extends true
  ? { lastModified?: Date | undefined }
  : unknown) &
  // async entries load it rendered
  (T['async'] extends false
    ? T['analysis'] extends 'runtime'
      ? { structuredData: () => Promise<StructuredData> }
      : unknown
    : unknown) & {
    extractedReferences?: ExtractedReference[];
  };

export interface DocMacroOptions<T extends DocMacroFlags = DocMacroFlags> {
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
  async?: T['async'];

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

  /**
   * The analysis of the outputs of a page: its table of contents, structured data, processed Markdown and extracted
   * references. `runtime` renders them for the props of the page, `static` analyses them from the source.
   *
   * With `runtime`, the structured data of pages is `() => Promise<StructuredData>`.
   *
   * @defaultValue `runtime` for `async` collections, `static` otherwise
   */
  analysis?: T['analysis'];

  schema?: CollectionSchema<T['schema'], MacroSchemaContext>;

  /** include last modified date in collection entries */
  lastModified?: T['lastModified'];
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
  T extends DocMacroFlags = DocMacroFlags,
  MetaSchema extends StandardSchemaV1 = StandardSchemaV1,
> {
  /**
   * Directory of content files, relative to project root.
   *
   * Must be statically analyzable (string literal).
   *
   * @defaultValue 'content/docs'
   */
  dir?: string;

  docs?: DocMacroOptions<T>;
  meta?: MetaMacroOptions<MetaSchema>;
}

export interface DefineDocCollectionsOptions<
  T extends DocMacroFlags = DocMacroFlags,
> extends DocMacroOptions<T> {
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

/**
 * Define a docs collection (doc + meta), compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineDocs<
  DocSchema extends StandardSchemaV1 = typeof pageSchema,
  MetaSchema extends StandardSchemaV1 = typeof metaSchema,
  const Async extends boolean = false,
  const LastModified extends boolean = false,
  const A extends Analysis | undefined = undefined,
>(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- compiled away by the bundler plugin
  options?: DefineDocsOptions<
    {
      schema: DocSchema;
      async: Async;
      lastModified: LastModified;
      analysis: A;
    },
    MetaSchema
  >,
): StandardSchemaV1.InferOutput<DocSchema> extends PageData
  ? StandardSchemaV1.InferOutput<MetaSchema> extends MetaData
    ? Async extends true
      ? MacroAsyncDocsCollection<
          StandardSchemaV1.InferOutput<DocSchema>,
          StandardSchemaV1.InferOutput<MetaSchema>,
          GetExtras<{
            schema: DocSchema;
            async: Async;
            lastModified: LastModified;
            analysis: A;
          }>
        >
      : MacroDocsCollection<
          StandardSchemaV1.InferOutput<DocSchema>,
          StandardSchemaV1.InferOutput<MetaSchema>,
          GetExtras<{
            schema: DocSchema;
            async: Async;
            lastModified: LastModified;
            analysis: A;
          }>
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
  const LastModified extends boolean = false,
  const A extends Analysis | undefined = undefined,
>(
  options: DefineDocCollectionsOptions<{
    schema: DocSchema;
    async: Async;
    lastModified: LastModified;
    analysis: A;
  }>,
): Async extends true
  ? MacroAsyncDocCollection<
      StandardJSONSchemaV1.InferOutput<DocSchema>,
      GetExtras<{
        schema: DocSchema;
        async: Async;
        lastModified: LastModified;
        analysis: A;
      }>
    >
  : MacroDocCollection<
      StandardJSONSchemaV1.InferOutput<DocSchema>,
      GetExtras<{
        schema: DocSchema;
        async: Async;
        lastModified: LastModified;
        analysis: A;
      }>
    >;

/**
 * Define a doc/meta collection, compiled by the bundler plugin.
 *
 * Requires the `include` option on your bundler plugin.
 */
export function defineCollections(): never {
  throw macroError();
}
